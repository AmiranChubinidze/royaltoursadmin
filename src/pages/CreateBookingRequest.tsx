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
import { Plus, Mail, Send, ArrowLeft, Plane } from "lucide-react";
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
        setSavedHotels(data.filter(h => h.email));
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

      // Strip the id field before saving
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <Plane className="h-7 w-7 text-primary" />
              Create Booking Request
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Build your itinerary by adding hotels. Drag to reorder.
            </p>
          </div>
        </div>

        {/* Guest Settings Card */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Default Guests:
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={sharedGuests.adults}
                    onChange={(e) => updateSharedGuests('adults', parseInt(e.target.value) || 1)}
                    className="w-14 h-9 text-center"
                  />
                  <span className="text-sm text-muted-foreground">Adults</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={sharedGuests.kids}
                    onChange={(e) => updateSharedGuests('kids', parseInt(e.target.value) || 0)}
                    className="w-14 h-9 text-center"
                  />
                  <span className="text-sm text-muted-foreground">Kids</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sync-guests"
                  checked={sharedGuests.applyToAll}
                  onCheckedChange={toggleSharedGuests}
                />
                <Label htmlFor="sync-guests" className="text-sm cursor-pointer">
                  Sync across all hotels
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itinerary Builder */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/30 bg-muted/30">
            <CardTitle className="text-lg font-semibold">Itinerary Builder</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={hotelBookings.map(b => b.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-4 overflow-x-auto pb-4 items-stretch">
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
                    className="min-w-[220px] w-[220px] flex-shrink-0 border-dashed border-2 border-border/60 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center group"
                    onClick={addHotelBooking}
                    style={{ minHeight: '360px' }}
                  >
                    <div className="text-center text-muted-foreground group-hover:text-primary transition-colors">
                      <div className="w-12 h-12 rounded-full bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center mx-auto mb-3 transition-colors">
                        <Plus className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium">Add Stop</span>
                    </div>
                  </Card>
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        {/* Email Preview */}
        {validEmailCount > 0 && (
          <Card className="border-border/50 shadow-sm">
            <Accordion type="single" collapsible defaultValue="">
              <AccordionItem value="email-preview" className="border-none">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Email Preview</span>
                    <span className="text-muted-foreground font-normal">
                      ({validEmailCount} {validEmailCount === 1 ? 'email' : 'emails'} ready)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {hotelBookings.filter(b => b.hotelName && b.hotelEmail).map((booking, index) => (
                      <Card key={index} className="bg-muted/30 border-border/40">
                        <CardHeader className="py-3 px-4 border-b border-border/30">
                          <CardTitle className="text-sm font-semibold">{booking.hotelName}</CardTitle>
                          <p className="text-xs text-muted-foreground">{booking.hotelEmail}</p>
                        </CardHeader>
                        <CardContent className="p-4">
                          <pre className="text-xs whitespace-pre-wrap font-mono bg-background/80 p-3 rounded-md border border-border/30">
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

        {/* Submit Button */}
        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || hotelBookings.every(b => !b.hotelName)}
            className="gap-2 px-8 shadow-lg hover:shadow-xl transition-shadow"
          >
            <Send className="h-4 w-4" />
            {isSubmitting 
              ? "Sending..." 
              : validEmailCount > 0 
                ? `Send ${validEmailCount} ${validEmailCount === 1 ? 'Email' : 'Emails'} & Save Draft`
                : "Save Draft"
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
