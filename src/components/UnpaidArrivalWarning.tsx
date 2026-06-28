import { AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { UnpaidArrival } from "@/hooks/useUnpaidArrivalsToday";

// Compact amber banner: guests check into these hotels today, not marked paid.
// Each row is clickable and jumps straight to the booking — the affected row in
// the table sits below every future arrival and may be off-screen, so the banner
// itself carries the workflow.
export function UnpaidArrivalsBanner({
  arrivals,
  className,
}: {
  arrivals: UnpaidArrival[];
  className?: string;
}) {
  const navigate = useNavigate();
  if (arrivals.length === 0) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-[0_10px_24px_rgba(15,76,92,0.06)]",
        className
      )}
    >
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800">
          {arrivals.length} unpaid {arrivals.length === 1 ? "hotel" : "hotels"} for today's arrivals
        </p>
      </div>
      <div className="divide-y divide-amber-200/70 border-t border-amber-200/70">
        {arrivals.map((a, i) => (
          <button
            key={`${a.confirmationId}-${a.hotel}-${i}`}
            type="button"
            onClick={() => navigate(`/confirmation/${a.confirmationId}`)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-amber-100/60"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-amber-900">
              {a.hotel}
            </span>
            <span className="hidden min-w-0 max-w-[40%] truncate text-xs text-amber-700 sm:block">
              {a.clientName || "—"}
            </span>
            <span className="font-mono text-[11px] text-amber-600">{a.confirmationCode}</span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-amber-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Small inline pill for a booking row whose guest arrives today at an unpaid hotel.
export function UnpaidArrivalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700",
        className
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      Unpaid arrival today
    </span>
  );
}
