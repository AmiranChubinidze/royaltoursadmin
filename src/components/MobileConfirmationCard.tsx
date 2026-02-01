import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Eye,
  Edit,
  Trash2,
  Paperclip,
  CheckCircle,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

interface MobileConfirmationCardProps {
  confirmation: {
    id: string;
    confirmation_code: string;
    main_client_name: string | null;
    arrival_date: string | null;
    tour_source: string | null;
    total_days: number | null;
    total_nights: number | null;
    status: string;
    client_paid: boolean | null;
    is_paid: boolean | null;
    created_at: string;
    updated_at: string;
    raw_payload: any;
  };
  canEditConfirmations: boolean;
  canDeleteConfirmations: boolean;
  effectiveIsBooking: boolean;
  effectiveIsVisitor: boolean;
  onDelete: (id: string) => void;
}

export function MobileConfirmationCard({
  confirmation,
  canEditConfirmations,
  canDeleteConfirmations,
  effectiveIsBooking,
  effectiveIsVisitor,
  onDelete,
}: MobileConfirmationCardProps) {
  const navigate = useNavigate();

  const createdAt = new Date(confirmation.created_at).getTime();
  const updatedAt = new Date(confirmation.updated_at).getTime();
  const wasEdited = updatedAt - createdAt > 60000;

  const trackingNumber = confirmation.raw_payload?.trackingNumber;
  const displaySource = trackingNumber || confirmation.tour_source || "—";

  return (
    <div
      className="rounded-2xl border border-border/60 bg-white/95 p-4 shadow-[0_10px_24px_rgba(15,76,92,0.08)] transition-all duration-150 active:scale-[0.995]"
      onClick={() => navigate(`/confirmation/${confirmation.id}`)}
    >
      {/* Top row: Code + Status badges */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-[#0F4C5C] text-base">
            {confirmation.confirmation_code}
          </span>
          {confirmation.status === "draft" && (
            <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
              Draft
            </Badge>
          )}
          {confirmation.client_paid && (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          )}
          {wasEdited && !effectiveIsVisitor && (
            <span className="text-[10px] text-muted-foreground">(edited)</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>

      {/* Client name */}
      <p className="font-semibold text-foreground text-[15px] mb-2 truncate">
        {confirmation.main_client_name || "No client name"}
      </p>

      {/* Info row */}
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mb-3">
        <span className="rounded-full bg-[#F1FAFB] px-2.5 py-1 text-[#0F4C5C]">
          {confirmation.arrival_date || "No date"}
        </span>
        <span className="rounded-full bg-muted/60 px-2.5 py-1">
          {confirmation.total_days}D / {confirmation.total_nights}N
        </span>
        <span className="rounded-full bg-muted/60 px-2.5 py-1 truncate max-w-[160px]">
          {displaySource}
        </span>
      </div>

      {/* Action buttons */}
      {(canEditConfirmations || effectiveIsBooking) && (
        <div
          className="flex items-center gap-2 pt-3 border-t border-border/60"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 rounded-full border-[#0F4C5C]/25 bg-[#EAF3F4] text-[#0F4C5C] hover:bg-[#DDECEE]"
            onClick={() => navigate(`/confirmation/${confirmation.id}`)}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            Open
          </Button>

          {(effectiveIsBooking || canEditConfirmations) && (
            <Button
              variant="outline"
              size="icon"
              className={confirmation.is_paid ? "h-9 w-9 text-emerald-600" : "h-9 w-9"}
              onClick={() => navigate(`/confirmation/${confirmation.id}/attachments`)}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}

          {canEditConfirmations && (
            <>
              {confirmation.status === "draft" ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-amber-600"
                  onClick={() =>
                    navigate(`/confirmation/${confirmation.id}/edit?complete=true`)
                  }
                >
                  <ClipboardCheck className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => navigate(`/confirmation/${confirmation.id}/edit`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              {canDeleteConfirmations && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
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
                        onClick={() => onDelete(confirmation.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
