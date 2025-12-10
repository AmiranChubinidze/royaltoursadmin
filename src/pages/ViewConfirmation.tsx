import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Copy, Mail, Trash2, Printer } from "lucide-react";
import { ConfirmationLetter } from "@/components/ConfirmationLetter";
import {
  useConfirmation,
  useDeleteConfirmation,
  useDuplicateConfirmation,
} from "@/hooks/useConfirmations";
import { toast } from "@/hooks/use-toast";
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
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import { ConfirmationPayload } from "@/types/confirmation";
import { format } from "date-fns";

export default function ViewConfirmation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  
  const { data: confirmation, isLoading, error } = useConfirmation(id);
  const deleteMutation = useDeleteConfirmation();
  const duplicateMutation = useDuplicateConfirmation();

  useEffect(() => {
    const emailStatus = searchParams.get("email_status");
    if (emailStatus === "success") {
      toast({
        title: "Emails sent successfully",
        description: "Hotel confirmation emails have been sent.",
      });
      setSearchParams({});
    } else if (emailStatus === "error") {
      toast({
        title: "Error sending emails",
        description: "Some emails could not be sent. Please try again.",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handlePrint = () => {
    window.print();
  };

  const handleDuplicate = async () => {
    if (!confirmation) return;
    try {
      const result = await duplicateMutation.mutateAsync(confirmation.id);
      toast({
        title: "Confirmation duplicated",
        description: "Redirecting to edit the duplicate...",
      });
      navigate(`/confirmation/${result.id}/edit`);
    } catch (error) {
      toast({
        title: "Error duplicating confirmation",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirmation) return;
    try {
      await deleteMutation.mutateAsync(confirmation.id);
      toast({
        title: "Confirmation deleted",
        description: "The confirmation has been removed.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error deleting confirmation",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendEmails = () => {
    if (!confirmation?.raw_payload) return;
    setEmailDialogOpen(true);
  };

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

  const emailStatus = searchParams.get("email_status");

  // Check if confirmation was edited
  const createdAt = new Date(confirmation.created_at).getTime();
  const updatedAt = new Date(confirmation.updated_at).getTime();
  const wasEdited = updatedAt - createdAt > 60000;
  const editedDate = wasEdited ? format(new Date(confirmation.updated_at), "dd/MM/yyyy") : null;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {editedDate && (
            <span className="text-xs text-muted-foreground">
              Edited: {editedDate}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(`/confirmation/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button
            variant="outline"
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>

          <Button
            variant="outline"
            onClick={handleSendEmails}
          >
            <Mail className="mr-2 h-4 w-4" />
            Send Emails
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this confirmation? This action
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
          className={`mb-4 p-4 rounded-md ${
            emailStatus === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {emailStatus === "success"
            ? "Hotel confirmation emails have been sent successfully."
            : "There was an error sending some emails. Please try again."}
        </div>
      )}

      {/* Confirmation Letter */}
      <ConfirmationLetter confirmation={confirmation} />

      {/* Email Preview Dialog */}
      {confirmation?.raw_payload && (
        <EmailPreviewDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          payload={confirmation.raw_payload as ConfirmationPayload}
          confirmationCode={confirmation.confirmation_code}
        />
      )}
    </div>
  );
}
