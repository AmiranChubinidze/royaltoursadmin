import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Copy, Mail, Trash2, Printer, FileText, Tag } from "lucide-react";
import { ConfirmationLetter } from "@/components/ConfirmationLetter";
import { LuggageTagView } from "@/components/LuggageTagView";
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
import { useUserRole } from "@/hooks/useUserRole";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useIsMobile } from "@/hooks/use-mobile";


export default function ViewConfirmation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"letter" | "tag">("letter");
  const { role } = useUserRole();
  const { viewAsRole } = useViewAs();
  const effectiveRole = viewAsRole || role;
  const isMobile = useIsMobile();
  
  const canEditConfirmations = effectiveRole === "admin" || effectiveRole === "worker" || effectiveRole === "coworker";
  const canManageConfirmations = effectiveRole === "admin" || effectiveRole === "worker";
  
  const { data: confirmation, isLoading, error } = useConfirmation(id);
  const deleteMutation = useDeleteConfirmation();
  const duplicateMutation = useDuplicateConfirmation();

  useEffect(() => {
    const emailStatus = searchParams.get("email_status");
    if (emailStatus === "success") {
      toast({ title: "Emails sent successfully", description: "Hotel confirmation emails have been sent." });
      setSearchParams({});
    } else if (emailStatus === "error") {
      toast({ title: "Error sending emails", description: "Some emails could not be sent.", variant: "destructive" });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handlePrint = () => {
    // Clean up any stale print styles when printing letter
    if (viewMode === "letter") {
      document.body.classList.remove("printing-luggage-tag");
      document
        .querySelectorAll("style#luggage-tag-print-styles")
        .forEach((el) => el.remove());
    }

    window.print();
  };

  const handleDuplicate = async () => {
    if (!confirmation) return;
    try {
      const result = await duplicateMutation.mutateAsync(confirmation.id);
      toast({ title: "Confirmation duplicated", description: "Redirecting to edit the duplicate..." });
      navigate(`/confirmation/${result.id}/edit`);
    } catch {
      toast({ title: "Error duplicating confirmation", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmation) return;
    try {
      await deleteMutation.mutateAsync(confirmation.id);
      toast({ title: "Confirmation deleted", description: "The confirmation has been removed." });
      navigate("/");
    } catch {
      toast({ title: "Error deleting confirmation", description: "Please try again.", variant: "destructive" });
    }
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
          <h1 className="text-2xl font-bold text-destructive mb-4">Confirmation not found</h1>
          <p className="text-muted-foreground mb-4">The confirmation doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate("/")}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </div>
      </div>
    );
  }

  const createdAt = new Date(confirmation.created_at).getTime();
  const updatedAt = new Date(confirmation.updated_at).getTime();
  const wasEdited = updatedAt - createdAt > 60000;
  const editedDate = wasEdited ? format(new Date(confirmation.updated_at), "dd/MM/yyyy") : null;

  return (
    <div className="container mx-auto py-8 px-4 print:p-0 print:m-0 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(-1)}
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {editedDate && <span className="text-xs text-muted-foreground">Edited: {editedDate}</span>}
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setViewMode("letter")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "letter" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <FileText className="h-4 w-4" />Letter
          </button>
          <button onClick={() => setViewMode("tag")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "tag" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Tag className="h-4 w-4" />Tag
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />Print
          </Button>
          {canEditConfirmations && (
            <>
              <Button variant="outline" onClick={() => navigate(`/confirmation/${id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</Button>
              {canManageConfirmations && (
                <>
                  <Button variant="outline" onClick={handleDuplicate} disabled={duplicateMutation.isPending}><Copy className="mr-2 h-4 w-4" />Duplicate</Button>
                  <Button variant="outline" onClick={() => setEmailDialogOpen(true)}><Mail className="mr-2 h-4 w-4" />Send Emails</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="confirmation-letter-wrapper">
        {viewMode === "letter" ? (
          isMobile ? (
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[960px]">
                <ConfirmationLetter confirmation={confirmation} />
              </div>
            </div>
          ) : (
            <ConfirmationLetter confirmation={confirmation} />
          )
        ) : (
          <LuggageTagView
            clients={(confirmation?.raw_payload as ConfirmationPayload)?.clients || []}
          />
        )}
      </div>

      {confirmation?.raw_payload && (
        <EmailPreviewDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen} payload={confirmation.raw_payload as ConfirmationPayload} confirmationCode={confirmation.confirmation_code} />
      )}
    </div>
  );
}
