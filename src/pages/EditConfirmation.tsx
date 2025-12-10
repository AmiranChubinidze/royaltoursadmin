import { useParams, useNavigate } from "react-router-dom";
import { ConfirmationForm } from "@/components/ConfirmationForm";
import { useConfirmation } from "@/hooks/useConfirmations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const EditConfirmation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: confirmation, isLoading, error } = useConfirmation(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !confirmation) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Confirmation not found
          </h2>
          <p className="text-muted-foreground mb-4">
            The confirmation you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <ConfirmationForm initialData={confirmation} isEdit />
      </div>
    </div>
  );
};

export default EditConfirmation;
