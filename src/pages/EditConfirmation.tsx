import { useParams, useNavigate } from "react-router-dom";
import { ConfirmationForm } from "@/components/ConfirmationForm";
import { useConfirmation, useUpdateConfirmation } from "@/hooks/useConfirmations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ConfirmationFormData, ConfirmationPayload } from "@/types/confirmation";
import { toast } from "@/hooks/use-toast";

export default function EditConfirmation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const initialData: Partial<ConfirmationFormData> = {
    tourSource: confirmation.tour_source || "",
    trackingNumber: payload?.trackingNumber || "",
    clients: payload?.clients || [{ name: "", passport: "" }],
    arrival: payload?.arrival || { date: "", time: "", flight: "", from: "" },
    departure: payload?.departure || { date: "", time: "", flight: "", to: "" },
    itinerary: payload?.itinerary || [{ date: "", day: "", route: "", hotel: "", roomType: "", meals: "" }],
    services: payload?.services || "",
    notes: payload?.notes || "",
  };

  const handleSubmit = async (data: ConfirmationFormData) => {
    try {
      await updateMutation.mutateAsync({
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
        },
      });

      toast({
        title: "Confirmation updated",
        description: "Your changes have been saved.",
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
