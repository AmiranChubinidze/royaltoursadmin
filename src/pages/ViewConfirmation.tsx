import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useConfirmation, useDeleteConfirmation, useDuplicateConfirmation } from "@/hooks/useConfirmations";
import { ConfirmationLetter } from "@/components/ConfirmationLetter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Printer, Edit, Copy, Trash2, Mail, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const ViewConfirmation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: confirmation, isLoading, error } = useConfirmation(id);
  const deleteMutation = useDeleteConfirmation();
  const duplicateMutation = useDuplicateConfirmation();

  // Handle email status from URL params
  useEffect(() => {
    const emailStatus = searchParams.get("emails");
    if (emailStatus === "sent") {
      toast({
        title: "Emails Sent",
        description: "Hotel booking emails have been sent successfully.",
      });
    } else if (emailStatus === "none") {
      toast({
        title: "No Emails Sent",
        description: "No hotels in the itinerary have registered email addresses.",
        variant: "destructive",
      });
    } else if (emailStatus === "error") {
      toast({
        title: "Email Error",
        description: "There was an error sending the hotel booking emails.",
        variant: "destructive",
      });
    }
  }, [searchParams]);

  const handlePrint = () => {
    window.print();
  };

  const handleDuplicate = async () => {
    if (!id) return;
    const result = await duplicateMutation.mutateAsync(id);
    navigate(`/confirmation/${result.id}/edit`);
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteMutation.mutateAsync(id);
    navigate("/");
  };

  const handleSendEmails = () => {
    // This will be implemented with an edge function
    toast({
      title: "Coming Soon",
      description: "Hotel email functionality will be available soon.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-[210mm] mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[297mm] w-full" />
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

  const emailStatus = searchParams.get("emails");

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      {/* Action Bar - Hidden on print */}
      <div className="no-print sticky top-0 z-10 bg-background border-b border-border shadow-sm">
        <div className="max-w-[210mm] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {confirmation.confirmation_code}
              </h1>
              <p className="text-sm text-muted-foreground">
                {confirmation.main_client_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/confirmation/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleDuplicate}
              disabled={duplicateMutation.isPending}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button variant="outline" onClick={handleSendEmails}>
              <Mail className="h-4 w-4 mr-2" />
              Send Hotel Emails
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete confirmation{" "}
                    <strong>{confirmation.confirmation_code}</strong>? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Email Status Banner */}
        {emailStatus && (
          <div
            className={`px-6 py-2 flex items-center gap-2 text-sm ${
              emailStatus === "sent"
                ? "bg-success/10 text-success"
                : emailStatus === "none"
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {emailStatus === "sent" && <CheckCircle className="h-4 w-4" />}
            {emailStatus === "none" && <AlertCircle className="h-4 w-4" />}
            {emailStatus === "error" && <XCircle className="h-4 w-4" />}
            <span>
              {emailStatus === "sent" && "Hotel booking emails sent successfully"}
              {emailStatus === "none" && "No hotels matched - no emails sent"}
              {emailStatus === "error" && "Error sending hotel emails"}
            </span>
          </div>
        )}
      </div>

      {/* Letter Content */}
      <div className="p-6 print:p-0">
        <div className="max-w-[210mm] mx-auto animate-fade-in">
          <ConfirmationLetter confirmation={confirmation} />
        </div>
      </div>
    </div>
  );
};

export default ViewConfirmation;
