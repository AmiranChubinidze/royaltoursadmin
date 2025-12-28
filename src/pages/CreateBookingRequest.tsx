import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Hotel {
  id: string;
  name: string;
  email: string;
}

const DEFAULT_EMAIL_TEMPLATE = `Please confirm the booking with the following details

Check in: 
Check out: 
Number of Adults: 
Number of Kids: 
Meal Type (BB/FB): 
Room Category (Standard/Upgrade): 

Please confirm receipt of this reservation request.

Best regards,
LLC Royal Georgian Tours
Phone: +995 592 005 450
Email: Royalgeorgiantours@gmail.com`;

export default function CreateBookingRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(true);
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [isSending, setIsSending] = useState(false);

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

  const toggleHotel = (hotelId: string) => {
    setSelectedHotels((prev) => {
      const next = new Set(prev);
      if (next.has(hotelId)) {
        next.delete(hotelId);
      } else {
        next.add(hotelId);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedHotels.size === 0) {
      toast({
        title: "No hotels selected",
        description: "Please select at least one hotel to send emails to",
        variant: "destructive",
      });
      return;
    }

    if (!emailBody.trim()) {
      toast({
        title: "Empty email body",
        description: "Please enter the email content",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const selectedHotelsList = hotels.filter((h) => selectedHotels.has(h.id));
      
      // Prepare email data for each hotel
      const emailsToSend = selectedHotelsList.map((hotel) => ({
        to: hotel.email,
        subject: `Reservation Request - Royal Georgian Tours`,
        body: emailBody,
        hotelName: hotel.name,
      }));

      // Send emails using the edge function
      const { data, error } = await supabase.functions.invoke("send-hotel-emails-custom", {
        body: { emails: emailsToSend },
      });

      if (error) throw error;

      // Create a draft confirmation record
      const hotelNames = selectedHotelsList.map((h) => h.name);
      
      // Generate a simple draft code
      const now = new Date();
      const dateCode = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(-2)}`;
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const draftCode = `DRAFT-${dateCode}-${randomSuffix}`;

      const { error: insertError } = await supabase
        .from("confirmations")
        .insert({
          confirmation_code: draftCode,
          date_code: dateCode,
          confirmation_date: now.toLocaleDateString("en-GB"),
          status: "draft",
          hotels_emailed: hotelNames,
          raw_payload: { emailBody, hotelsEmailed: hotelNames },
        });

      if (insertError) {
        console.error("Error saving draft:", insertError);
        // Still show success for emails sent
        toast({
          title: "Emails sent",
          description: `Sent ${emailsToSend.length} email(s), but failed to save draft record`,
          variant: "default",
        });
      } else {
        toast({
          title: "Success!",
          description: `Sent ${emailsToSend.length} email(s) and saved draft`,
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
              Send hotel availability requests
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Hotel Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Hotels to Email</CardTitle>
              <CardDescription>
                Choose which hotels to send the booking request to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHotels ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : hotels.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hotels with email addresses found. Please add hotel emails in Saved Data.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {hotels.map((hotel) => (
                    <label
                      key={hotel.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedHotels.has(hotel.id)}
                        onCheckedChange={() => toggleHotel(hotel.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{hotel.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {hotel.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selectedHotels.size > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  {selectedHotels.size} hotel(s) selected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Email Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Content</CardTitle>
              <CardDescription>
                Fill in the booking details below. This same email will be sent to all selected hotels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Subject</p>
                  <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                    Reservation Request - Royal Georgian Tours
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Body</p>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="min-h-[350px] font-mono text-sm"
                    placeholder="Enter email content..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Send Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || selectedHotels.size === 0}
              size="lg"
            >
              {isSending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {selectedHotels.size > 0 ? `${selectedHotels.size} Email(s)` : "Emails"} & Save Draft
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
