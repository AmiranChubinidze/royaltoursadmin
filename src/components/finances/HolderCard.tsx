import { format } from "date-fns";
import { Wallet, Building2, CreditCard, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { HolderWithBalance, HolderType } from "@/hooks/useHolders";

const HOLDER_ICONS: Record<HolderType, React.ElementType> = {
  cash: Wallet,
  bank: Building2,
  card: CreditCard,
};

const HOLDER_COLORS: Record<HolderType, string> = {
  cash: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  bank: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  card: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

interface HolderCardProps {
  holder: HolderWithBalance;
  onClick?: () => void;
}

export function HolderCard({ holder, onClick }: HolderCardProps) {
  const Icon = HOLDER_ICONS[holder.type];
  const colorClass = HOLDER_COLORS[holder.type];
  const currencySymbol = holder.currency === "GEL" ? "₾" : "$";

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const isNegative = holder.balance < 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
        isNegative && "border-destructive/30 bg-destructive/5"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg", colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium text-sm text-foreground">{holder.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{holder.type}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {holder.currency}
        </span>
      </div>

      {/* Balance */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
        <p
          className={cn(
            "text-xl font-bold",
            isNegative ? "text-destructive" : "text-foreground"
          )}
        >
          {isNegative && "-"}
          {formatAmount(holder.balance)}
        </p>
      </div>

      {/* Pending */}
      <div className="flex gap-4 text-xs">
        {holder.pendingIn > 0 && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span>+{formatAmount(holder.pendingIn)}</span>
          </div>
        )}
        {holder.pendingOut > 0 && (
          <div className="flex items-center gap-1 text-destructive">
            <TrendingDown className="h-3 w-3" />
            <span>-{formatAmount(holder.pendingOut)}</span>
          </div>
        )}
      </div>

      {/* Last Activity */}
      {holder.lastActivity && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Last: {format(new Date(holder.lastActivity), "MMM d, yyyy")}</span>
        </div>
      )}
    </div>
  );
}
