import { format } from "date-fns";
import { User, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { HolderWithBalance } from "@/hooks/useHolders";

interface HolderCardProps {
  holder: HolderWithBalance;
  onClick?: () => void;
}

export function HolderCard({ holder, onClick }: HolderCardProps) {
  const hasUSD = holder.balanceUSD !== 0 || holder.pendingInUSD > 0 || holder.pendingOutUSD > 0;
  const hasGEL = holder.balanceGEL !== 0 || holder.pendingInGEL > 0 || holder.pendingOutGEL > 0;
  
  const isNegativeUSD = holder.balanceUSD < 0;
  const isNegativeGEL = holder.balanceGEL < 0;
  const hasAnyNegative = isNegativeUSD || isNegativeGEL;

  const formatAmount = (amount: number, symbol: string) => {
    return `${symbol}${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
        hasAnyNegative && "border-destructive/30 bg-destructive/5"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium text-sm text-foreground">{holder.name}</h3>
          </div>
        </div>
      </div>

      {/* Balances - Show both currencies */}
      <div className="space-y-2 mb-3">
        {/* USD Balance */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">USD</span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-lg font-bold",
                isNegativeUSD ? "text-destructive" : "text-foreground"
              )}
            >
              {isNegativeUSD && "-"}
              {formatAmount(holder.balanceUSD, "$")}
            </span>
            {holder.pendingInUSD > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                +{formatAmount(holder.pendingInUSD, "$")}
              </span>
            )}
            {holder.pendingOutUSD > 0 && (
              <span className="text-xs text-destructive flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" />
                -{formatAmount(holder.pendingOutUSD, "$")}
              </span>
            )}
          </div>
        </div>

        {/* GEL Balance */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">GEL</span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-lg font-bold",
                isNegativeGEL ? "text-destructive" : "text-foreground"
              )}
            >
              {isNegativeGEL && "-"}
              {formatAmount(holder.balanceGEL, "₾")}
            </span>
            {holder.pendingInGEL > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                +{formatAmount(holder.pendingInGEL, "₾")}
              </span>
            )}
            {holder.pendingOutGEL > 0 && (
              <span className="text-xs text-destructive flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" />
                -{formatAmount(holder.pendingOutGEL, "₾")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Last Activity */}
      {holder.lastActivity && (
        <div className="pt-3 border-t border-border flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Last: {format(new Date(holder.lastActivity), "MMM d, yyyy")}</span>
        </div>
      )}
    </div>
  );
}
