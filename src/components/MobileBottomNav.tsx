import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Home, PlusCircle, Shield, Database, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useViewAs } from "@/contexts/ViewAsContext";

const navItemBase =
  "flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-medium transition-colors";

export function MobileBottomNav() {
  const location = useLocation();
  const { role } = useUserRole();
  const { viewAsRole } = useViewAs();

  const effectiveRole = viewAsRole || role;
  const isAdmin = effectiveRole === "admin";
  const isBooking = effectiveRole === "booking";
  const canSeeFinances = ["admin", "accountant", "coworker"].includes(effectiveRole);

  const items = [
    { to: "/", label: "Home", icon: Home },
    ...(canSeeFinances ? [{ to: "/finances", label: "Finances", icon: Wallet }] : []),
    { to: "/calendar", label: "Calendar", icon: CalendarDays },
    ...(isBooking ? [{ to: "/saved-data", label: "Saved", icon: Database }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ];
  const isFinances = location.pathname.startsWith("/finances");

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="relative mx-auto flex max-w-md items-center justify-between rounded-[26px] border border-border/70 bg-white/90 px-3 py-2 shadow-[0_10px_30px_rgba(15,76,92,0.12)] backdrop-blur">
        {isFinances ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("rtg:open-transaction"))}
            className="absolute -top-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-2xl bg-[#1B7C8A] text-white shadow-[0_12px_20px_rgba(27,124,138,0.35)]"
            aria-label="Add transaction"
          >
            <PlusCircle className="h-6 w-6" />
          </button>
        ) : (
          <Link
            to="/new"
            className="absolute -top-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-2xl bg-[#0F4C5C] text-white shadow-[0_12px_20px_rgba(15,76,92,0.35)]"
          >
            <PlusCircle className="h-6 w-6" />
          </Link>
        )}
        {items.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                navItemBase,
                active
                  ? "text-[#0F4C5C] bg-[#EAF3F4]"
                  : "text-muted-foreground hover:text-[#0F4C5C]"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-[#0F4C5C]" : "text-[#6B7280]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
