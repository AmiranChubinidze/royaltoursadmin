import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Mail, Send, Plus, Hotel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelBookingCard, generateEmailBody } from "@/components/HotelBookingCard";
import { HotelBooking } from "@/types/confirmation";

interface Hotel {
  id: string;
  name: string;
  email: string;
}

export default function CreateBookingRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Hotel bookings - each hotel has its own booking details
  const [hotelBookings, setHotelBookings] = useState<HotelBooking[]>([]);

  // For adding new hotels
  const [showHotelSelector, setShowHotelSelector] = useState(false);

  // Load hotels with emails
  useEffect(() => {
    async function loadHotels() {
      const { data, error } = await supabase
        .from("saved_hotels")
        .select("id, name, email")
        .not("email", "is", null)
        .neq("email", "")
        .order("name");

      if (error) {
        console.error("Error loading hotels:", error);
        toast({
          title: "Error",
          description: "Failed to load hotels",
          variant: "destructive",
        });
      } else {
        setHotels(data || []);
      }
      setIsLoadingHotels(false);
    }
    loadHotels();
  }, [toast]);

  const addHotelBooking = (hotel: Hotel) => {
    // Don't add duplicates
    if (hotelBookings.some((b) => b.hotelId === hotel.id)) {
      toast({
        title: "Already added",
        description: `${hotel.name} is already in your booking list`,
        variant: "destructive",
      });
      return;
    }

    const newBooking: HotelBooking = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      hotelEmail: hotel.email,
      checkIn: "",
      checkOut: "",
      numAdults: 2,
      numKids: 0,
      mealType: "BB",
      roomCategory: "Standard",
    };

    setHotelBookings((prev) => [...prev, newBooking]);
    setShowHotelSelector(false);
  };

  const updateHotelBooking = (index: number, booking: HotelBooking) => {
    setHotelBookings((prev) =>
      prev.map((b, i) => (i === index ? booking : b))
    );
  };

  const removeHotelBooking = (index: number) => {
    setHotelBookings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (hotelBookings.length === 0) {
      toast({
        title: "No hotels selected",
        description: "Please add at least one hotel to send emails to",
        variant: "destructive",
      });
      return;
    }

    // Validate all bookings have dates
    const invalidBookings = hotelBookings.filter(
      (b) => !b.checkIn || !b.checkOut
    );
    if (invalidBookings.length > 0) {
      toast({
        title: "Missing dates",
        description: "Please fill in check-in and check-out dates for all hotels",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Prepare email data for each hotel with their specific details
      const emailsToSend = hotelBookings.map((booking) => ({
        hotelName: booking.hotelName,
        hotelEmail: booking.hotelEmail,
        subject: `Reservation Request - Royal Georgian Tours`,
        body: generateEmailBody(booking),
      }));

      // Send emails using the edge function
      const { data, error } = await supabase.functions.invoke(
        "send-hotel-emails-custom",
        {
          body: { emails: emailsToSend },
        }
      );

      if (error) throw error;

      // Create a draft confirmation record with structured hotelBookings data
      const hotelNames = hotelBookings.map((b) => b.hotelName);

      // Generate a draft code
      const now = new Date();
      const dateCode = `${String(now.getDate()).padStart(2, "0")}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}${String(now.getFullYear()).slice(-2)}`;
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const draftCode = `DRAFT-${dateCode}-${randomSuffix}`;

      // Calculate earliest check-in and latest check-out for the draft
      const checkInDates = hotelBookings
        .map((b) => parseDateDDMMYYYY(b.checkIn))
        .filter((d): d is Date => d !== null);
      const checkOutDates = hotelBookings
        .map((b) => parseDateDDMMYYYY(b.checkOut))
        .filter((d): d is Date => d !== null);

      const earliestCheckIn = checkInDates.length > 0
        ? formatDateDDMMYYYY(new Date(Math.min(...checkInDates.map((d) => d.getTime()))))
        : null;
      const latestCheckOut = checkOutDates.length > 0
        ? formatDateDDMMYYYY(new Date(Math.max(...checkOutDates.map((d) => d.getTime()))))
        : null;

      const { error: insertError } = await supabase
        .from("confirmations")
        .insert([{
          confirmation_code: draftCode,
          date_code: dateCode,
          confirmation_date: now.toLocaleDateString("en-GB"),
          status: "draft",
          hotels_emailed: hotelNames,
          arrival_date: earliestCheckIn,
          departure_date: latestCheckOut,
          raw_payload: {
            hotelBookings: hotelBookings,
            clients: [],
            arrival: { date: earliestCheckIn || "", time: "", flight: "", from: "" },
            departure: { date: latestCheckOut || "", time: "", flight: "", to: "" },
            itinerary: [],
          } as any,
        }]);

      if (insertError) {
        console.error("Error saving draft:", insertError);
        toast({
          title: "Emails sent",
          description: `Sent ${emailsToSend.length} email(s), but failed to save draft record`,
          variant: "default",
        });
      } else {
        toast({
          title: "Success!",
          description: `Sent ${emailsToSend.length} email(s) to hotels and saved draft`,
        });
      }

      navigate("/");
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send emails",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Get hotels not yet added
  const availableHotels = hotels.filter(
    (h) => !hotelBookings.some((b) => b.hotelId === h.id)
  );

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Create Booking Request
            </h1>
            <p className="text-muted-foreground">
              Send customized booking requests to each hotel
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Hotel Booking Cards */}
          {hotelBookings.map((booking, index) => (
            <HotelBookingCard
              key={booking.hotelId}
              booking={booking}
              onChange={(updated) => updateHotelBooking(index, updated)}
              onRemove={() => removeHotelBooking(index)}
              canRemove={hotelBookings.length > 0}
            />
          ))}

          {/* Add Hotel Section */}
          {showHotelSelector ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  Select a Hotel to Add
                </CardTitle>
                <CardDescription>
                  Choose from your saved hotels with email addresses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHotels ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : availableHotels.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      {hotels.length === 0
                        ? "No hotels with email addresses found. Please add hotel emails in Saved Data."
                        : "All available hotels have been added."}
                    </p>
                    <Button
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setShowHotelSelector(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableHotels.map((hotel) => (
                      <button
                        key={hotel.id}
                        onClick={() => addHotelBooking(hotel)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-colors text-left"
                      >
                        <Hotel className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{hotel.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {hotel.email}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full mt-2"
                      onClick={() => setShowHotelSelector(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full h-16 border-dashed border-2 hover:border-primary/50"
              onClick={() => setShowHotelSelector(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Hotel
            </Button>
          )}

          {/* Send Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || hotelBookings.length === 0}
              size="lg"
            >
              {isSending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {hotelBookings.length > 0 ? `${hotelBookings.length} Email(s)` : "Emails"} & Save Draft
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function parseDateDDMMYYYY(value: string): Date | null {
  if (!value) return null;
  const parts = value.split(/[\/\-]/);
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
