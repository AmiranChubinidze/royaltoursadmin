import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, Send } from "lucide-react";
import { ConfirmationPayload, GuestInfo } from "@/types/confirmation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface HotelEmailData {
  hotelName: string;
  hotelEmail: string;
  clientName: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  meals: string;
  guestInfo: GuestInfo;
}

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: ConfirmationPayload;
  confirmationCode: string;
}

function generateEmailBody(hotel: HotelEmailData): string {
  let kidsInfo = "0";
  if (hotel.guestInfo.numKids > 0) {
    const agesStr = hotel.guestInfo.kidsAges.map(k => `${k.age} YO`).join(", ");
    kidsInfo = `${hotel.guestInfo.numKids} (${agesStr})`;
  }

  return `Please confirm the booking with the following details

Check in: ${hotel.checkIn}
Check out: ${hotel.checkOut}
Number of Adults: ${hotel.guestInfo.numAdults}
Number of Kids: ${kidsInfo}
Meal Type (BB/FB): ${hotel.meals}
Room Category (Standard/Upgrade): ${hotel.roomType}
Guest Name: ${hotel.clientName}

Please confirm receipt of this reservation request.

Best regards,
LLC Royal Georgian Tours
Phone: +995 599 123 456
Email: Royalgeorgiantours@gmail.com`;
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  payload,
  confirmationCode,
}: EmailPreviewDialogProps) {
  const [hotels, setHotels] = useState<HotelEmailData[]>([]);
  const [emailBodies, setEmailBodies] = useState<Record<string, string>>({});
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadHotelData();
    }
  }, [open, payload]);

  const loadHotelData = async () => {
    // Fetch saved hotels from database
    const { data: savedHotels } = await supabase
      .from("saved_hotels")
      .select("name, email");

    const hotelEmailMap: Record<string, string> = {};
    savedHotels?.forEach(hotel => {
      if (hotel.email) {
        hotelEmailMap[hotel.name] = hotel.email;
      }
    });

    // Extract unique hotels from itinerary
    const hotelMap = new Map<string, { checkIn: string; checkOut: string; roomType: string; meals: string }>();

    for (const day of payload.itinerary) {
      if (day.hotel && !hotelMap.has(day.hotel)) {
        hotelMap.set(day.hotel, {
          checkIn: day.date,
          checkOut: day.date,
          roomType: day.roomType || "Standard",
          meals: day.meals || "BB",
        });
      } else if (day.hotel && hotelMap.has(day.hotel)) {
        const existing = hotelMap.get(day.hotel)!;
        existing.checkOut = day.date;
      }
    }

    const mainClient = payload.clients[0];
    const guestInfo = payload.guestInfo || { numAdults: 1, numKids: 0, kidsAges: [] };

    const hotelList: HotelEmailData[] = [];
    const bodies: Record<string, string> = {};
    const subjs: Record<string, string> = {};

    for (const [hotelName, dates] of hotelMap.entries()) {
      const hotelEmail = hotelEmailMap[hotelName];
      if (hotelEmail) {
        const hotelData: HotelEmailData = {
          hotelName,
          hotelEmail,
          clientName: mainClient?.name || "Guest",
          checkIn: dates.checkIn,
          checkOut: dates.checkOut,
          roomType: dates.roomType,
          meals: dates.meals,
          guestInfo,
        };
        hotelList.push(hotelData);
        bodies[hotelName] = generateEmailBody(hotelData);
        subjs[hotelName] = `Reservation Confirmation - ${mainClient?.name || "Guest"} - ${confirmationCode}`;
      }
    }

    setHotels(hotelList);
    setEmailBodies(bodies);
    setSubjects(subjs);
    if (hotelList.length > 0) {
      setSelectedHotel(hotelList[0].hotelName);
    }
  };

  const handleSend = async () => {
    if (hotels.length === 0) {
      toast({
        title: "No hotels to send",
        description: "No hotels with email addresses found in this confirmation.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const emailData = hotels.map(hotel => ({
        hotelName: hotel.hotelName,
        hotelEmail: hotel.hotelEmail,
        subject: subjects[hotel.hotelName],
        body: emailBodies[hotel.hotelName],
      }));

      const { data, error } = await supabase.functions.invoke("send-hotel-emails-custom", {
        body: { emails: emailData, confirmationCode },
      });

      if (error) throw error;

      const successCount = data.results.filter((r: { success: boolean }) => r.success).length;

      if (successCount === hotels.length) {
        toast({
          title: "Emails sent successfully",
          description: `All ${successCount} hotel confirmation emails were sent.`,
        });
        onOpenChange(false);
      } else if (successCount > 0) {
        toast({
          title: "Some emails sent",
          description: `${successCount} of ${hotels.length} emails were sent.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send emails",
          description: "No emails could be sent. Check Gmail configuration.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      toast({
        title: "Error sending emails",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const currentHotel = hotels.find(h => h.hotelName === selectedHotel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preview
          </DialogTitle>
        </DialogHeader>

        {hotels.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No hotels with email addresses found in this confirmation.
            <br />
            Please add hotel emails in the Saved Data section.
          </div>
        ) : (
          <div className="space-y-4">
            {hotels.length > 1 && (
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Select Hotel</Label>
                <select
                  value={selectedHotel}
                  onChange={(e) => setSelectedHotel(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {hotels.map(hotel => (
                    <option key={hotel.hotelName} value={hotel.hotelName}>
                      {hotel.hotelName} ({hotel.hotelEmail})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {currentHotel && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">To</Label>
                  <Input
                    value={currentHotel.hotelEmail}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Subject</Label>
                  <Input
                    value={subjects[selectedHotel] || ""}
                    onChange={(e) => setSubjects(prev => ({
                      ...prev,
                      [selectedHotel]: e.target.value
                    }))}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Email Body</Label>
                  <Textarea
                    value={emailBodies[selectedHotel] || ""}
                    onChange={(e) => setEmailBodies(prev => ({
                      ...prev,
                      [selectedHotel]: e.target.value
                    }))}
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || hotels.length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            {isSending ? "Sending..." : `Send ${hotels.length > 1 ? `All ${hotels.length} Emails` : "Email"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
