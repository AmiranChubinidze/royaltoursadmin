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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Mail, Send, ArrowLeft, Plane, Users, FileText, ArrowUpRight, Trash2, Edit, X } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { CompactHotelBookingCard, HotelBooking } from "@/components/CompactHotelBookingCard";
import { useBookingDrafts, useCreateBookingDraft, useDeleteBookingDraft, useUpdateBookingDraft, BookingDraft } from "@/hooks/useBookingDrafts";
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
  const [isTransferring, setIsTransferring] = useState<string | null>(null);
  const [savedHotels, setSavedHotels] = useState<{ name: string; email: string }[]>([]);
  
  const { data: drafts, isLoading: draftsLoading } = useBookingDrafts();
  const createDraft = useCreateBookingDraft();
  const deleteDraft = useDeleteBookingDraft();
  const updateDraft = useUpdateBookingDraft();
  const [sharedGuests, setSharedGuests] = useState({ adults: 2, kids: 0, applyToAll: true });
  
  // Editing state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [originalHotelBookings, setOriginalHotelBookings] = useState<HotelBooking[]>([]);
  const [sendingHotelIndex, setSendingHotelIndex] = useState<number | null>(null);
  
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
    // Only validate bookings that have an email (hotels requiring booking)
    const bookingsWithEmail = hotelBookings.filter(b => b.hotelEmail);
    const invalidBookings = bookingsWithEmail.filter(
      (b) => !b.hotelName || !b.checkIn || !b.checkOut
    );

    if (bookingsWithEmail.length === 0) {
      toast.error("Please add at least one hotel with an email address");
      return;
    }

    if (invalidBookings.length > 0) {
      toast.error("Please fill in check-in and check-out dates for all hotels");
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingsToSave = hotelBookings.map(({ id, ...rest }) => rest);
      const totalAdults = hotelBookings.reduce((max, b) => Math.max(max, b.numAdults || 0), 0);
      const totalKids = hotelBookings.reduce((max, b) => Math.max(max, b.numKids || 0), 0);

      // Save as draft first
      await createDraft.mutateAsync({
        hotel_bookings: bookingsToSave,
        guest_info: { numAdults: totalAdults, numKids: totalKids },
        emails_sent: true,
      });

      // Send emails
      const hotelsToEmail = hotelBookings.filter(b => b.hotelEmail);
      
      const { error: emailError } = await supabase.functions.invoke("send-hotel-emails", {
        body: {
          hotels: hotelsToEmail.map((booking) => ({
            hotelName: booking.hotelName,
            hotelEmail: booking.hotelEmail,
            clientName: "TBD",
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            roomType: booking.roomCategory,
            meals: booking.mealType,
            confirmationCode: "PENDING",
            guestInfo: {
              numAdults: booking.numAdults,
              numKids: booking.numKids,
              kidsAges: [],
            },
          })),
          confirmationCode: "PENDING",
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.warning(`Draft saved but emails failed: ${emailError.message}`);
      } else {
        toast.success(`Sent ${hotelsToEmail.length} emails and saved draft`);
      }

      // Reset form
      setHotelBookings([{
        id: crypto.randomUUID(),
        hotelName: "",
        hotelEmail: "",
        checkIn: "",
        checkOut: "",
        numAdults: 2,
        numKids: 0,
        mealType: "BB",
        roomCategory: "Standard",
      }]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to create booking request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferToConfirmation = async (draft: BookingDraft) => {
    setIsTransferring(draft.id);

    try {
      const today = new Date();
      const dateCode = format(today, "ddMMyy");
      
      const { count } = await supabase
        .from("confirmations")
        .select("*", { count: "exact", head: true })
        .eq("date_code", dateCode);

      const sequenceNumber = (count || 0) + 1;
      const confirmationCode = `${dateCode}-${String(sequenceNumber).padStart(3, "0")}`;

      const hotelNames = draft.hotel_bookings.map((b) => b.hotelName);

      const checkInDates = draft.hotel_bookings
        .map((b) => parseDateDDMMYYYY(b.checkIn))
        .filter((d): d is Date => d !== null);
      const checkOutDates = draft.hotel_bookings
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

      const totalGuests = draft.guest_info.numAdults + draft.guest_info.numKids;
      const emptyClients = Array.from({ length: totalGuests }, () => ({ name: "", passport: "" }));

      const { data: insertedData, error: insertError } = await supabase
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
            hotelBookings: draft.hotel_bookings,
            clients: emptyClients,
            guestInfo: { numAdults: draft.guest_info.numAdults, numKids: draft.guest_info.numKids, kidsAges: [] },
            arrival: { date: earliestCheckIn || "", time: "", flight: "", from: "" },
            departure: { date: latestCheckOut || "", time: "", flight: "", to: "" },
            itinerary: [],
            services: "",
            notes: "",
          } as any,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Delete the draft after successful transfer
      await deleteDraft.mutateAsync(draft.id);

      toast.success(`Created draft confirmation ${confirmationCode}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to transfer to confirmation");
    } finally {
      setIsTransferring(null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteDraft.mutateAsync(id);
      toast.success("Draft deleted");
      // Clear editing state if we're deleting the draft we're editing
      if (editingDraftId === id) {
        handleCancelEdit();
      }
    } catch (error) {
      toast.error("Failed to delete draft");
    }
  };

  const handleEditDraft = (draft: BookingDraft) => {
    setEditingDraftId(draft.id);
    setOriginalHotelBookings(draft.hotel_bookings);
    setHotelBookings(
      draft.hotel_bookings.map((b) => ({
        ...b,
        id: crypto.randomUUID(),
      }))
    );
    setSharedGuests({
      adults: draft.guest_info.numAdults,
      kids: draft.guest_info.numKids,
      applyToAll: true,
    });
  };

  const handleCancelEdit = () => {
    setEditingDraftId(null);
    setOriginalHotelBookings([]);
    setHotelBookings([
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
    setSharedGuests({ adults: 2, kids: 0, applyToAll: true });
  };

  const handleSaveEditedDraft = async () => {
    if (!editingDraftId) return;
    
    setIsSubmitting(true);
    try {
      const bookingsToSave = hotelBookings.map(({ id, ...rest }) => rest);
      const totalAdults = hotelBookings.reduce((max, b) => Math.max(max, b.numAdults || 0), 0);
      const totalKids = hotelBookings.reduce((max, b) => Math.max(max, b.numKids || 0), 0);

      await updateDraft.mutateAsync({
        id: editingDraftId,
        hotel_bookings: bookingsToSave,
        guest_info: { numAdults: totalAdults, numKids: totalKids },
      });

      toast.success("Draft updated");
      handleCancelEdit();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHotelModified = (index: number): boolean => {
    if (!editingDraftId || !originalHotelBookings[index]) return false;
    const original = originalHotelBookings[index];
    const current = hotelBookings[index];
    if (!current) return false;
    
    return (
      original.hotelName !== current.hotelName ||
      original.hotelEmail !== current.hotelEmail ||
      original.checkIn !== current.checkIn ||
      original.checkOut !== current.checkOut ||
      original.numAdults !== current.numAdults ||
      original.numKids !== current.numKids ||
      original.mealType !== current.mealType ||
      original.roomCategory !== current.roomCategory
    );
  };

  const handleSendSingleHotel = async (index: number) => {
    const booking = hotelBookings[index];
    if (!booking.hotelEmail) {
      toast.error("No email address for this hotel");
      return;
    }

    setSendingHotelIndex(index);
    try {
      const { error: emailError } = await supabase.functions.invoke("send-hotel-emails", {
        body: {
          hotels: [{
            hotelName: booking.hotelName,
            hotelEmail: booking.hotelEmail,
            clientName: "TBD",
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            roomType: booking.roomCategory,
            meals: booking.mealType,
            confirmationCode: "PENDING",
            guestInfo: {
              numAdults: booking.numAdults,
              numKids: booking.numKids,
              kidsAges: [],
            },
          }],
          confirmationCode: "PENDING",
        },
      });

      if (emailError) {
        toast.error(`Failed to send email: ${emailError.message}`);
      } else {
        toast.success(`Email sent to ${booking.hotelName}`);
        
        // Update the original to match current (so it's no longer "modified")
        setOriginalHotelBookings((prev) => {
          const updated = [...prev];
          updated[index] = { ...booking };
          delete (updated[index] as any).id;
          return updated;
        });

        // Also save the draft with the updated hotel
        if (editingDraftId) {
          const bookingsToSave = hotelBookings.map(({ id, ...rest }) => rest);
          await updateDraft.mutateAsync({
            id: editingDraftId,
            hotel_bookings: bookingsToSave,
          });
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send email");
    } finally {
      setSendingHotelIndex(null);
    }
  };

  const validEmailCount = hotelBookings.filter(b => b.hotelName && b.hotelEmail).length;

  return (
    <div>
      {/* Minimal Header */}
      <div className="border-b border-border/50 bg-muted/30 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-4">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <Plane className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">
            {editingDraftId ? "Edit Booking Draft" : "Create Booking Request"}
          </h1>
          {editingDraftId && (
            <Badge variant="outline" className="ml-2 border-amber-500 text-amber-600">
              Editing
            </Badge>
          )}
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
                    <div key={booking.id} className="flex flex-col">
                      <CompactHotelBookingCard
                        id={booking.id}
                        booking={booking}
                        index={index}
                        onChange={(updated) => updateHotelBooking(index, updated)}
                        onRemove={() => removeHotelBooking(index)}
                        canRemove={hotelBookings.length > 1}
                        isCheckInLinked={isCheckInLinked(index)}
                        savedHotels={savedHotels}
                        hideGuestFields={sharedGuests.applyToAll}
                      />
                      {/* Send button for modified hotels while editing */}
                      {editingDraftId && isHotelModified(index) && booking.hotelEmail && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendSingleHotel(index)}
                          disabled={sendingHotelIndex === index}
                          className="mt-2 gap-1.5 border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                        >
                          <Send className="h-3 w-3" />
                          {sendingHotelIndex === index ? "Sending..." : "Send Update"}
                        </Button>
                      )}
                      {editingDraftId && !isHotelModified(index) && originalHotelBookings[index] && (
                        <Badge variant="outline" className="mt-2 justify-center border-emerald-500 text-emerald-600">
                          <Mail className="h-3 w-3 mr-1" />
                          Sent
                        </Badge>
                      )}
                    </div>
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

        {/* Saved Drafts Section */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 py-4 px-5 border-b border-border/50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Saved Drafts</CardTitle>
              {drafts && drafts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {drafts.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {draftsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !drafts?.length ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No drafts yet. Send emails to hotels to create drafts.
              </p>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <Card key={draft.id} className="bg-muted/20 border-border/40 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {draft.hotel_bookings.map(b => b.hotelName).filter(Boolean).join(" → ") || "No hotels"}
                          </span>
                          {draft.emails_sent && (
                            <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">
                              <Mail className="h-3 w-3 mr-1" />
                              Emails Sent
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{draft.guest_info.numAdults} Adults{draft.guest_info.numKids > 0 ? ` + ${draft.guest_info.numKids} Kids` : ""}</span>
                          <span>•</span>
                          <span>{format(new Date(draft.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditDraft(draft)}
                          disabled={editingDraftId === draft.id}
                          className="gap-1.5"
                        >
                          <Edit className="h-4 w-4" />
                          {editingDraftId === draft.id ? "Editing..." : "Edit"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleTransferToConfirmation(draft)}
                          disabled={isTransferring === draft.id || editingDraftId === draft.id}
                          className="gap-1.5"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          {isTransferring === draft.id ? "Transferring..." : "Transfer"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDraft(draft.id)}
                          disabled={editingDraftId === draft.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spacer for floating button */}
        <div className="h-20" />
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {editingDraftId && (
          <Button
            size="lg"
            variant="outline"
            onClick={handleCancelEdit}
            className="gap-2 px-6 h-14 text-base font-semibold shadow-xl bg-background rounded-full"
          >
            <X className="h-5 w-5" />
            Cancel
          </Button>
        )}
        <Button
          size="lg"
          onClick={editingDraftId ? handleSaveEditedDraft : handleSubmit}
          disabled={isSubmitting || hotelBookings.every(b => !b.hotelName)}
          className="gap-2 px-6 h-14 text-base font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 bg-primary hover:bg-primary/90 rounded-full"
        >
          <Send className="h-5 w-5" />
          {isSubmitting 
            ? (editingDraftId ? "Saving..." : "Sending...")
            : editingDraftId
              ? "Save Draft"
              : validEmailCount > 0 
                ? `Send ${validEmailCount}`
                : "Save"
          }
        </Button>
      </div>
    </div>
  );
}
