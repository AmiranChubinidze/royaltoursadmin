import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ConfirmationForm } from "@/components/ConfirmationForm";
import { useConfirmation, useUpdateConfirmation } from "@/hooks/useConfirmations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ConfirmationFormData, ConfirmationPayload, HotelBooking, ItineraryDay } from "@/types/confirmation";
import { toast } from "@/hooks/use-toast";
import { parseDateDDMMYYYY, formatDateDDMMYYYY, generateItineraryFromBookings } from "@/lib/confirmationUtils";


export default function EditConfirmation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isCompletingDraft = searchParams.get("complete") === "true";
  
  const { data: confirmation, isLoading, error } = useConfirmation(id);
  const updateMutation = useUpdateConfirmation();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !confirmation) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Confirmation not found
          </h1>
          <p className="text-muted-foreground mb-4">
            The confirmation you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const payload = confirmation.raw_payload as ConfirmationPayload;
  const isDraft = confirmation.status === "draft";
  const hotelBookings = payload?.hotelBookings as HotelBooking[] | undefined;

  // For draft completions, auto-generate itinerary from hotel bookings
  let generatedItinerary: ItineraryDay[] = [];
  let arrivalDate = "";
  let departureDate = "";
  let numAdults = 1;
  let numKids = 0;

  // Check if we have hotel bookings data to generate from
  const hasHotelBookings = isDraft && hotelBookings && hotelBookings.length > 0;

  if (hasHotelBookings) {
    generatedItinerary = generateItineraryFromBookings(hotelBookings);
    
    // Calculate arrival/departure from hotel bookings
    const allCheckIns = hotelBookings
      .map((b) => parseDateDDMMYYYY(b.checkIn))
      .filter((d): d is Date => d !== null);
    const allCheckOuts = hotelBookings
      .map((b) => parseDateDDMMYYYY(b.checkOut))
      .filter((d): d is Date => d !== null);

    if (allCheckIns.length > 0) {
      arrivalDate = formatDateDDMMYYYY(new Date(Math.min(...allCheckIns.map((d) => d.getTime()))));
    }
    if (allCheckOuts.length > 0) {
      departureDate = formatDateDDMMYYYY(new Date(Math.max(...allCheckOuts.map((d) => d.getTime()))));
    }

    // Use max guest counts from hotel bookings
    numAdults = hotelBookings.reduce((max, b) => Math.max(max, b.numAdults || 0), 1);
    numKids = hotelBookings.reduce((max, b) => Math.max(max, b.numKids || 0), 0);
  }

  // Generate empty client fields if needed (based on total guests)
  const totalGuests = numAdults + numKids;
  const generateEmptyClients = () => Array.from({ length: Math.max(1, totalGuests) }, () => ({ name: "", passport: "" }));

  // Check if existing clients have any filled data
  const hasFilledClients = payload?.clients?.some(c => c.name.trim() !== "" || c.passport.trim() !== "");

  // Determine initial data - use generated data for drafts with hotel bookings
  const initialData: Partial<ConfirmationFormData> = {
    tourSource: confirmation.tour_source || payload?.tourSource || "",
    trackingNumber: payload?.trackingNumber || "",
    clients: hasFilledClients 
      ? payload.clients 
      : (hasHotelBookings ? generateEmptyClients() : [{ name: "", passport: "" }]),
    guestInfo: payload?.guestInfo || { 
      numAdults: hasHotelBookings ? numAdults : 1, 
      numKids: hasHotelBookings ? numKids : 0, 
      kidsAges: [] 
    },
    arrival: hasHotelBookings 
      ? { date: arrivalDate, time: "", flight: "", from: "" }
      : (payload?.arrival || { date: "", time: "", flight: "", from: "" }),
    departure: hasHotelBookings
      ? { date: departureDate, time: "", flight: "", to: "" }
      : (payload?.departure || { date: "", time: "", flight: "", to: "" }),
    itinerary: hasHotelBookings && generatedItinerary.length > 0
      ? generatedItinerary
      : (payload?.itinerary?.length > 0 
          ? payload.itinerary 
          : [{ date: "", day: "", route: "", hotel: "", roomType: "", meals: "YES" }]),
    services: payload?.services || "",
    notes: payload?.notes || "",
    price: confirmation.price ?? payload?.price ?? null,
    selectedRuleIds: payload?.selectedRuleIds || [],
  };

  // Debug logging for draft completion
  if (isDraft && isCompletingDraft) {
    console.log("Completing draft:", {
      hasHotelBookings,
      hotelBookings,
      generatedItinerary,
      initialData,
    });
  }

  const handleSubmit = async (data: ConfirmationFormData) => {
    try {
      // When completing a draft, change status to confirmed
      const updatePayload: any = {
        id: confirmation.id,
        payload: {
          clients: data.clients,
          arrival: data.arrival,
          departure: data.departure,
          itinerary: data.itinerary,
          trackingNumber: data.trackingNumber,
          services: data.services,
          notes: data.notes,
          tourSource: data.tourSource,
          guestInfo: data.guestInfo,
          price: data.price,
          selectedRuleIds: data.selectedRuleIds,
          // Keep hotelBookings for reference
          hotelBookings: hotelBookings,
        },
      };

      // If completing a draft, update the status
      if (isDraft && isCompletingDraft) {
        updatePayload.status = "confirmed";
      }

      await updateMutation.mutateAsync(updatePayload);

      toast({
        title: isDraft && isCompletingDraft ? "Draft completed" : "Confirmation updated",
        description: isDraft && isCompletingDraft 
          ? "The draft has been converted to a confirmed booking."
          : "Your changes have been saved.",
      });

      navigate(`/confirmation/${confirmation.id}`);
    } catch (error) {
      toast({
        title: "Error updating confirmation",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <ConfirmationForm
      initialData={initialData}
      onSubmit={handleSubmit}
      isEdit
    />
  );
}
