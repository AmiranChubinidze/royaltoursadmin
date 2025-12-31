import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Mail, Send, ArrowLeft, Plane, Users, Sparkles } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { CompactHotelBookingCard, HotelBooking } from "@/components/CompactHotelBookingCard";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

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
  
  const [hotelBookings, setHotelBookings] = useState<(HotelBooking & { id: string })[]>([
    {
      id: crypto.randomUUID(),
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchHotels = async () => {
      const { data, error } = await supabase
        .from("saved_hotels")
        .select("name, email")
        .order("name");
      
      if (!error && data) {
        setSavedHotels(data.map(h => ({ name: h.name, email: h.email || "" })));
      }
    };
    fetchHotels();
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setHotelBookings((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addHotelBooking = () => {
    const lastBooking = hotelBookings[hotelBookings.length - 1];
    const newBooking = {
      id: crypto.randomUUID(),
      hotelName: "",
      hotelEmail: "",
      checkIn: lastBooking?.checkOut || "",
      checkOut: "",
      numAdults: sharedGuests.applyToAll ? sharedGuests.adults : 2,
      numKids: sharedGuests.applyToAll ? sharedGuests.kids : 0,
      mealType: "BB" as const,
      roomCategory: "Standard" as const,
    };
    setHotelBookings([...hotelBookings, newBooking]);
  };

  const updateHotelBooking = (index: number, booking: HotelBooking) => {
    setHotelBookings((prev) => {
      const updated = prev.map((b, i) => (i === index ? { ...booking, id: b.id } : b));
      
      if (booking.checkOut && index < updated.length - 1) {
        const nextHotel = updated[index + 1];
        if (!nextHotel.checkIn || nextHotel.checkIn === prev[index].checkOut) {
          updated[index + 1] = { ...nextHotel, checkIn: booking.checkOut };
        }
      }

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
    const invalidBookings = hotelBookings.filter(
      (b) => !b.hotelName || !b.hotelEmail || !b.checkIn || !b.checkOut
    );

    if (invalidBookings.length > 0) {
      toast.error("Please fill in all hotel details including email, check-in and check-out dates");
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date();
      const dateCode = format(today, "ddMMyy");
      
      const { count } = await supabase
        .from("confirmations")
        .select("*", { count: "exact", head: true })
        .eq("date_code", dateCode);

      const sequenceNumber = (count || 0) + 1;
      const confirmationCode = `${dateCode}-${String(sequenceNumber).padStart(3, "0")}`;

      const hotelNames = hotelBookings.map((b) => b.hotelName);

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

      const totalAdults = hotelBookings.reduce((max, b) => Math.max(max, b.numAdults || 0), 0);
      const totalKids = hotelBookings.reduce((max, b) => Math.max(max, b.numKids || 0), 0);
      const totalGuests = totalAdults + totalKids;
      const emptyClients = Array.from({ length: totalGuests }, () => ({ name: "", passport: "" }));

      const bookingsToSave = hotelBookings.map(({ id, ...rest }) => rest);

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
            hotelBookings: bookingsToSave,
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

  const validEmailCount = hotelBookings.filter(b => b.hotelName && b.hotelEmail).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/")} 
            className="shrink-0 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Plane className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">Create Booking Request</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        {/* Guest Settings Card */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-muted/50 to-muted/30 px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Guest Settings</span>
            </div>
          </div>
          <CardContent className="py-4 px-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Adults
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={sharedGuests.adults}
                    onChange={(e) => updateSharedGuests('adults', parseInt(e.target.value) || 1)}
                    className="w-16 h-10 text-center font-medium"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Kids
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={sharedGuests.kids}
                    onChange={(e) => updateSharedGuests('kids', parseInt(e.target.value) || 0)}
                    className="w-16 h-10 text-center font-medium"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sync-guests"
                  checked={sharedGuests.applyToAll}
                  onCheckedChange={toggleSharedGuests}
                />
                <Label htmlFor="sync-guests" className="text-sm cursor-pointer font-medium">
                  Apply to all stops
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itinerary Cards */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={hotelBookings.map(b => b.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-5 overflow-x-auto pb-4 items-stretch scrollbar-thin">
                  {hotelBookings.map((booking, index) => (
                    <CompactHotelBookingCard
                      key={booking.id}
                      id={booking.id}
                      booking={booking}
                      index={index}
                      onChange={(updated) => updateHotelBooking(index, updated)}
                      onRemove={() => removeHotelBooking(index)}
                      canRemove={hotelBookings.length > 1}
                      isCheckInLinked={isCheckInLinked(index)}
                      savedHotels={savedHotels}
                    />
                  ))}
                  
                  {/* Add Hotel Card */}
                  <Card 
                    className="min-w-[240px] w-[240px] flex-shrink-0 border-dashed border-2 border-border/60 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 flex items-center justify-center group"
                    onClick={addHotelBooking}
                    style={{ minHeight: '420px' }}
                  >
                    <div className="text-center text-muted-foreground group-hover:text-primary transition-colors duration-300">
                      <div className="w-14 h-14 rounded-full bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110">
                        <Plus className="h-7 w-7" />
                      </div>
                      <span className="text-sm font-semibold">Add Stop</span>
                      <p className="text-xs mt-1 opacity-70">Click to add another hotel</p>
                    </div>
                  </Card>
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        {/* Email Preview */}
        {validEmailCount > 0 && (
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <Accordion type="single" collapsible defaultValue="">
              <AccordionItem value="email-preview" className="border-none">
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-semibold">Email Preview</span>
                      <span className="text-muted-foreground font-normal ml-2">
                        {validEmailCount} {validEmailCount === 1 ? 'email' : 'emails'} ready to send
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {hotelBookings.filter(b => b.hotelName && b.hotelEmail).map((booking, index) => (
                      <Card key={index} className="bg-muted/20 border-border/40 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border/30">
                          <CardTitle className="text-sm font-semibold">{booking.hotelName}</CardTitle>
                          <p className="text-xs text-muted-foreground">{booking.hotelEmail}</p>
                        </CardHeader>
                        <CardContent className="p-4">
                          <pre className="text-xs whitespace-pre-wrap font-mono bg-background p-3 rounded-lg border border-border/30 max-h-48 overflow-auto">
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
        )}

        {/* Spacer for floating button */}
        <div className="h-20" />
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || hotelBookings.every(b => !b.hotelName)}
          className="gap-2 px-6 h-14 text-base font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 bg-primary hover:bg-primary/90 rounded-full"
        >
          <Send className="h-5 w-5" />
          {isSubmitting 
            ? "Sending..." 
            : validEmailCount > 0 
              ? `Send ${validEmailCount}`
              : "Save"
          }
        </Button>
      </div>
    </div>
  );
}
