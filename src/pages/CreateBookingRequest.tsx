import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Plus, Mail, Send, ArrowLeft } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { CompactHotelBookingCard, HotelBooking } from "@/components/CompactHotelBookingCard";

const parseDateDDMMYYYY = (value: string): Date | null => {
  if (!value) return null;
  const parsed = parse(value, "dd/MM/yyyy", new Date());
  return isValid(parsed) ? parsed : null;
};

const formatDateDDMMYYYY = (date: Date): string => {
  return format(date, "dd/MM/yyyy");
};

const generateEmailBody = (booking: HotelBooking): string => {
  const checkInDate = parseDateDDMMYYYY(booking.checkIn);
  const checkOutDate = parseDateDDMMYYYY(booking.checkOut);
  
  let nights = 0;
  if (checkInDate && checkOutDate) {
    nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const guestText = booking.numKids > 0 
    ? `${booking.numAdults} Adults + ${booking.numKids} Kids`
    : `${booking.numAdults} Adults`;

  return `Dear ${booking.hotelName},

Please book the following:

Check-in: ${booking.checkIn}
Check-out: ${booking.checkOut}
Nights: ${nights}
Guests: ${guestText}
Meal: ${booking.mealType === "FB" ? "Full Board" : "Bed & Breakfast"}
Room: ${booking.roomCategory}

Best regards,
Royal Travel Georgia`;
};

export default function CreateBookingRequest() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedHotels, setSavedHotels] = useState<{ name: string; email: string }[]>([]);
  const [sharedGuests, setSharedGuests] = useState({ adults: 2, kids: 0, applyToAll: true });
  
  const [hotelBookings, setHotelBookings] = useState<HotelBooking[]>([
    {
      hotelName: "",
      hotelEmail: "",
      checkIn: "",
      checkOut: "",
      numAdults: 2,
      numKids: 0,
      mealType: "BB",
      roomCategory: "Standard",
    },
  ]);

  useEffect(() => {
    const fetchHotels = async () => {
      const { data, error } = await supabase
        .from("saved_hotels")
        .select("name, email")
        .order("name");
      
      if (!error && data) {
        setSavedHotels(data.filter(h => h.email));
      }
    };
    fetchHotels();
  }, []);

  const addHotelBooking = () => {
    const lastBooking = hotelBookings[hotelBookings.length - 1];
    const newBooking: HotelBooking = {
      hotelName: "",
      hotelEmail: "",
      checkIn: lastBooking?.checkOut || "", // Auto-link from previous checkout
      checkOut: "",
      numAdults: sharedGuests.applyToAll ? sharedGuests.adults : 2,
      numKids: sharedGuests.applyToAll ? sharedGuests.kids : 0,
      mealType: "BB",
      roomCategory: "Standard",
    };
    setHotelBookings([...hotelBookings, newBooking]);
  };

  const updateHotelBooking = (index: number, booking: HotelBooking) => {
    setHotelBookings((prev) => {
      const updated = prev.map((b, i) => (i === index ? booking : b));
      
      // Auto-link: If checkout changed and there's a next hotel
      if (booking.checkOut && index < updated.length - 1) {
        const nextHotel = updated[index + 1];
        // Only auto-set if next hotel's check-in is empty OR matches old checkout
        if (!nextHotel.checkIn || nextHotel.checkIn === prev[index].checkOut) {
          updated[index + 1] = { ...nextHotel, checkIn: booking.checkOut };
        }
      }

      // If shared guests is enabled, sync guest counts
      if (sharedGuests.applyToAll) {
        const newAdults = booking.numAdults;
        const newKids = booking.numKids;
        if (newAdults !== sharedGuests.adults || newKids !== sharedGuests.kids) {
          setSharedGuests({ ...sharedGuests, adults: newAdults, kids: newKids });
          return updated.map(b => ({ ...b, numAdults: newAdults, numKids: newKids }));
        }
      }
      
      return updated;
    });
  };

  const removeHotelBooking = (index: number) => {
    if (hotelBookings.length > 1) {
      setHotelBookings(hotelBookings.filter((_, i) => i !== index));
    }
  };

  const toggleSharedGuests = () => {
    const newApplyToAll = !sharedGuests.applyToAll;
    setSharedGuests({ ...sharedGuests, applyToAll: newApplyToAll });
    
    if (newApplyToAll) {
      // Apply current shared values to all hotels
      setHotelBookings(prev => 
        prev.map(b => ({ ...b, numAdults: sharedGuests.adults, numKids: sharedGuests.kids }))
      );
    }
  };

  const updateSharedGuests = (field: 'adults' | 'kids', value: number) => {
    const newShared = { ...sharedGuests, [field]: value };
    setSharedGuests(newShared);
    
    if (sharedGuests.applyToAll) {
      setHotelBookings(prev => 
        prev.map(b => ({ 
          ...b, 
          numAdults: field === 'adults' ? value : b.numAdults,
          numKids: field === 'kids' ? value : b.numKids 
        }))
      );
    }
  };

  const isCheckInLinked = (index: number): boolean => {
    if (index === 0) return false;
    const prevBooking = hotelBookings[index - 1];
    const currentBooking = hotelBookings[index];
    return prevBooking?.checkOut === currentBooking?.checkIn && currentBooking?.checkIn !== "";
  };

  const handleSubmit = async () => {
    // Validate all bookings have required fields
    const invalidBookings = hotelBookings.filter(
      (b) => !b.hotelName || !b.hotelEmail || !b.checkIn || !b.checkOut
    );

    if (invalidBookings.length > 0) {
      toast.error("Please fill in all hotel details including email, check-in and check-out dates");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate confirmation code
      const today = new Date();
      const dateCode = format(today, "ddMMyy");
      
      const { count } = await supabase
        .from("confirmations")
        .select("*", { count: "exact", head: true })
        .eq("date_code", dateCode);

      const sequenceNumber = (count || 0) + 1;
      const confirmationCode = `${dateCode}-${String(sequenceNumber).padStart(3, "0")}`;

      // Get hotel names for tracking
      const hotelNames = hotelBookings.map((b) => b.hotelName);

      // Calculate dates from all bookings
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

      // Calculate total days and nights from earliest check-in to latest check-out
      let totalDays = 1;
      let totalNights = 0;
      if (checkInDates.length > 0 && checkOutDates.length > 0) {
        const earliestDate = new Date(Math.min(...checkInDates.map((d) => d.getTime())));
        const latestDate = new Date(Math.max(...checkOutDates.map((d) => d.getTime())));
        const diffTime = latestDate.getTime() - earliestDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalNights = diffDays;
        totalDays = diffDays + 1;
      }

      // Calculate total guests from all hotel bookings and create empty client fields
      const totalAdults = hotelBookings.reduce((max, b) => Math.max(max, b.numAdults || 0), 0);
      const totalKids = hotelBookings.reduce((max, b) => Math.max(max, b.numKids || 0), 0);
      const totalGuests = totalAdults + totalKids;
      const emptyClients = Array.from({ length: totalGuests }, () => ({ name: "", passport: "" }));

      const { error: insertError } = await supabase
        .from("confirmations")
        .insert([{
          confirmation_code: confirmationCode,
          date_code: dateCode,
          confirmation_date: format(today, "yyyy-MM-dd"),
          status: "draft",
          hotels_emailed: hotelNames,
          arrival_date: earliestCheckIn,
          departure_date: latestCheckOut,
          total_days: totalDays,
          total_nights: totalNights,
          raw_payload: {
            hotelBookings: hotelBookings,
            clients: emptyClients,
            guestInfo: { numAdults: totalAdults, numKids: totalKids, kidsAges: [] },
            arrival: { date: earliestCheckIn || "", time: "", flight: "", from: "" },
            departure: { date: latestCheckOut || "", time: "", flight: "", to: "" },
            itinerary: [],
            services: "",
            notes: "",
          } as any,
        }]);

      if (insertError) throw insertError;

      // Send emails to hotels
      const { error: emailError } = await supabase.functions.invoke("send-hotel-emails", {
        body: {
          bookings: hotelBookings.map((booking) => ({
            hotelName: booking.hotelName,
            hotelEmail: booking.hotelEmail,
            emailBody: generateEmailBody(booking),
          })),
          confirmationCode,
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.warning(`Draft saved but emails failed: ${emailError.message}`);
      } else {
        toast.success(`Sent ${hotelBookings.length} emails and saved draft ${confirmationCode}`);
      }

      navigate("/");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to create booking request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Booking Request</h1>
            <p className="text-muted-foreground text-sm">Build your itinerary and send emails to hotels</p>
          </div>
        </div>

        {/* Shared Guest Count */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Guests:</Label>
                <Input
                  type="number"
                  min={1}
                  value={sharedGuests.adults}
                  onChange={(e) => updateSharedGuests('adults', parseInt(e.target.value) || 1)}
                  className="w-16 h-8"
                />
                <span className="text-sm text-muted-foreground">Adults</span>
                <Input
                  type="number"
                  min={0}
                  value={sharedGuests.kids}
                  onChange={(e) => updateSharedGuests('kids', parseInt(e.target.value) || 0)}
                  className="w-16 h-8"
                />
                <span className="text-sm text-muted-foreground">Kids</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sharedGuests.applyToAll}
                  onChange={toggleSharedGuests}
                  className="w-4 h-4"
                />
                <span className="text-sm">Same for all hotels</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Hotel Timeline */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Itinerary Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-4 items-start">
              {hotelBookings.map((booking, index) => (
                <div key={index} className="flex items-center">
                  <CompactHotelBookingCard
                    booking={booking}
                    index={index}
                    onChange={(updated) => updateHotelBooking(index, updated)}
                    onRemove={() => removeHotelBooking(index)}
                    canRemove={hotelBookings.length > 1}
                    isCheckInLinked={isCheckInLinked(index)}
                    savedHotels={savedHotels}
                  />
                  {index < hotelBookings.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-primary mx-2 flex-shrink-0" />
                  )}
                </div>
              ))}
              
              {/* Add Hotel Card */}
              <Card 
                className="min-w-[200px] w-[200px] flex-shrink-0 border-dashed border-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center"
                onClick={addHotelBooking}
                style={{ minHeight: '280px' }}
              >
                <div className="text-center text-muted-foreground">
                  <Plus className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm">Add Hotel</span>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Email Preview Accordion */}
        <Card className="mb-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="email-preview" className="border-none">
              <AccordionTrigger className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Email Preview ({hotelBookings.filter(b => b.hotelName && b.hotelEmail).length} emails)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {hotelBookings.filter(b => b.hotelName && b.hotelEmail).map((booking, index) => (
                    <Card key={index} className="bg-muted/50">
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-sm">{booking.hotelName}</CardTitle>
                        <p className="text-xs text-muted-foreground">{booking.hotelEmail}</p>
                      </CardHeader>
                      <CardContent className="py-2 px-3">
                        <pre className="text-xs whitespace-pre-wrap font-mono bg-background p-2 rounded">
                          {generateEmailBody(booking)}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || hotelBookings.every(b => !b.hotelName)}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Sending..." : `Send ${hotelBookings.filter(b => b.hotelEmail).length} Emails and Save Draft`}
          </Button>
        </div>
      </div>
    </div>
  );
}
