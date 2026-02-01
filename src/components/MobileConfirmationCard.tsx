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
      className="bg-card border border-border rounded-xl p-4 active:bg-muted/50 transition-all duration-150 shadow-[0_1px_3px_0_hsl(210_20%_20%/0.04)]"
      onClick={() => navigate(`/confirmation/${confirmation.id}`)}
    >
      {/* Top row: Code + Status badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-primary text-lg">
            {confirmation.confirmation_code}
          </span>
          {confirmation.status === "draft" && (
            <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
              Draft
            </Badge>
          )}
          {confirmation.client_paid && (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          )}
          {wasEdited && !effectiveIsVisitor && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </div>

      {/* Client name */}
      <p className="font-medium text-foreground text-base mb-2 truncate">
        {confirmation.main_client_name || "No client name"}
      </p>

      {/* Info row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
        <span>{confirmation.arrival_date || "No date"}</span>
        <span>{confirmation.total_days}D / {confirmation.total_nights}N</span>
        <span className="truncate max-w-[120px]">{displaySource}</span>
      </div>

      {/* Action buttons */}
      {(canEditConfirmations || effectiveIsBooking) && (
        <div
          className="flex gap-2 pt-3 border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/confirmation/${confirmation.id}`)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>

          {(effectiveIsBooking || effectiveCanManageConfirmations) && (
            <Button
              variant="outline"
              size="sm"
              className={confirmation.is_paid ? "text-emerald-600" : ""}
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
                  size="sm"
                  className="text-amber-600"
                  onClick={() =>
                    navigate(`/confirmation/${confirmation.id}/edit?complete=true`)
                  }
                >
                  <ClipboardCheck className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
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
                      size="sm"
                      className="text-destructive hover:text-destructive"
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
