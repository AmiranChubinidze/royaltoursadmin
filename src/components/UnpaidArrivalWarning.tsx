import { useState } from "react";
import { AlertTriangle, BellOff, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSetHotelIgnored } from "@/hooks/useHotelApprovals";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import type { UnpaidArrival } from "@/hooks/useUnpaidArrivalsToday";

// Local money formatting, matching the idiom used in CalendarPage/ExpenseRules.
// ponytail: not extracting a shared formatter — that's a refactor of ~8 call
// sites, not part of this change.
const money = (amount: number, currency: string) =>
  `${currency === "GEL" ? "₾" : "$"}${Math.round(amount).toLocaleString()}`;

// How late a stay is, as one chip whose colour carries the meaning. The old
// version buried this as "11/08/2026 · 3d late" inline text at the same size as
// everything else, so nothing stood out.
export function overdueSeverity(daysLate: number): { label: string; className: string } {
  if (daysLate <= 0) return { label: "Today", className: "bg-amber-100 text-amber-800" };
  if (daysLate <= 3) return { label: `${daysLate}d late`, className: "bg-amber-200 text-amber-900" };
  return { label: `${daysLate}d late`, className: "bg-rose-100 text-rose-700" };
}

// Per-currency totals. Never sum USD and GEL — the same rule the calendar's
// "Total due" and the warning email already follow.
function outstanding(arrivals: UnpaidArrival[]): string | null {
  const byCurrency: Record<string, number> = {};
  for (const a of arrivals) {
    if (a.amount != null) byCurrency[a.currency] = (byCurrency[a.currency] || 0) + a.amount;
  }
  const parts = Object.entries(byCurrency).map(([currency, amount]) => money(amount, currency));
  return parts.length ? parts.join(" · ") : null;
}

const VISIBLE_ROWS = 4;

function ArrivalRow({ arrival }: { arrival: UnpaidArrival }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const setIgnored = useSetHotelIgnored();
  const severity = overdueSeverity(arrival.daysLate);

  const ignore = () => {
    setIgnored.mutate(
      {
        confirmationId: arrival.confirmationId,
        hotel: arrival.hotel,
        checkIn: arrival.checkIn,
        ignored: true,
      },
      {
        onSuccess: () =>
          toast({
            title: `${arrival.hotel} ignored`,
            description: "It won't appear in the unpaid list again.",
            action: (
              <ToastAction
                altText={`Undo ignoring ${arrival.hotel}`}
                onClick={() =>
                  setIgnored.mutate({
                    confirmationId: arrival.confirmationId,
                    hotel: arrival.hotel,
                    checkIn: arrival.checkIn,
                    ignored: false,
                  })
                }
              >
                Undo
              </ToastAction>
            ),
          }),
      }
    );
  };

  return (
    <div className="group flex items-center transition-colors hover:bg-amber-100/60">
      <button
        type="button"
        onClick={() => navigate(`/confirmation/${arrival.confirmationId}`)}
        title={`Check-in ${arrival.checkIn}`}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 pr-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-amber-900">{arrival.hotel}</span>
          <span className="block truncate text-[11px] text-amber-700/80">
            {arrival.clientName || "—"} · {arrival.confirmationCode}
          </span>
        </span>
        {arrival.amount != null && (
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-amber-900">
            {money(arrival.amount, arrival.currency)}
          </span>
        )}
        <span
          className={cn(
            "whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
            severity.className
          )}
        >
          {severity.label}
        </span>
      </button>

      {/* Sibling of the navigating button, never nested inside it — a button in
          a button is invalid markup and breaks keyboard navigation. */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Ignore the unpaid warning for ${arrival.hotel}`}
            className={cn(
              "mr-2 h-7 w-7 shrink-0 text-amber-700 hover:bg-amber-200/70 hover:text-amber-900",
              // No hover on touch, so the action has to be visible there.
              !isMobile && "opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
            )}
          >
            <BellOff className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop warning about this hotel?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{arrival.hotel}</strong> · check-in {arrival.checkIn} won't appear in the
              unpaid list again, even though it isn't marked paid. The daily email will still
              include it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={ignore}>Ignore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Amber banner: guests have checked into these hotels (today or in the last 30
// days) and they're still not marked paid. Overdue leads, most-late first. Each
// row jumps to its booking — the affected row in the table sits below every
// future arrival and is usually off-screen, so the banner carries the workflow.
export function UnpaidArrivalsBanner({
  arrivals,
  className,
}: {
  arrivals: UnpaidArrival[];
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (arrivals.length === 0) return null;

  const overdue = arrivals.filter((a) => a.daysLate > 0).length;
  const total = outstanding(arrivals);
  const visible = arrivals.slice(0, VISIBLE_ROWS);
  const hidden = arrivals.slice(VISIBLE_ROWS);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-[0_10px_24px_rgba(15,76,92,0.06)]",
        className
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-amber-800">
          {arrivals.length} unpaid {arrivals.length === 1 ? "hotel" : "hotels"}
          {overdue > 0 && <span className="font-normal text-amber-700"> · {overdue} overdue</span>}
        </p>
        {total && (
          <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-amber-900">
            {total}
          </p>
        )}
      </div>

      <div className="divide-y divide-amber-200/70 border-t border-amber-200/70">
        {visible.map((a) => (
          <ArrivalRow key={`${a.confirmationId}-${a.hotel}-${a.checkIn}`} arrival={a} />
        ))}
      </div>

      {hidden.length > 0 && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleContent>
            <div className="divide-y divide-amber-200/70 border-t border-amber-200/70">
              {hidden.map((a) => (
                <ArrivalRow key={`${a.confirmationId}-${a.hotel}-${a.checkIn}`} arrival={a} />
              ))}
            </div>
          </CollapsibleContent>
          <CollapsibleTrigger className="flex w-full items-center justify-center gap-1.5 border-t border-amber-200/70 py-2 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100/60">
            {expanded ? "Show less" : `${hidden.length} more`}
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
            />
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
}

// Small inline pill for a booking row with a checked-in hotel that isn't paid.
// Says "unpaid hotel", not "unpaid today" — the same booking can carry a stay
// arriving today and one that's been overdue for a week.
export function UnpaidArrivalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700",
        className
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      Unpaid hotel
    </span>
  );
}
