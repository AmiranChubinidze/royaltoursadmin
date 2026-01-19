import { format } from "date-fns";
import { User, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { HolderWithBalance } from "@/hooks/useHolders";
import { useCurrency } from "@/contexts/CurrencyContext";

interface HolderCardProps {
  holder: HolderWithBalance;
  onClick?: () => void;
}

export function HolderCard({ holder, onClick }: HolderCardProps) {
  const { exchangeRate } = useCurrency();
  
  const GEL_TO_USD_RATE = exchangeRate.gel_to_usd;
  const USD_TO_GEL_RATE = exchangeRate.usd_to_gel;
  
  const hasUSD = holder.balanceUSD !== 0 || holder.pendingInUSD > 0 || holder.pendingOutUSD > 0;
  const hasGEL = holder.balanceGEL !== 0 || holder.pendingInGEL > 0 || holder.pendingOutGEL > 0;
  
  const isNegativeUSD = holder.balanceUSD < 0;
  const isNegativeGEL = holder.balanceGEL < 0;
  const hasAnyNegative = isNegativeUSD || isNegativeGEL;
  
  // Combined totals in both currencies
  const totalInUSD = holder.balanceUSD + (holder.balanceGEL * GEL_TO_USD_RATE);
  const totalInGEL = holder.balanceGEL + (holder.balanceUSD * USD_TO_GEL_RATE);
  const isTotalNegative = totalInUSD < 0;

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
        <div className="text-right text-xs">
          <span className={cn("font-semibold", isTotalNegative ? "text-destructive" : "text-foreground")}>
            {isTotalNegative && "-"}${Math.abs(totalInUSD).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-muted-foreground/50 mx-1">/</span>
          <span className={cn("font-semibold", isTotalNegative ? "text-destructive" : "text-foreground")}>
            {isTotalNegative && "-"}₾{Math.abs(totalInGEL).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Balances - Grid layout for alignment */}
      <div className="space-y-1.5 mb-3 bg-muted/30 rounded-lg p-2.5">
        {/* USD Balance */}
        <div className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">USD</span>
          <span
            className={cn(
              "text-lg font-bold tabular-nums text-right",
              isNegativeUSD ? "text-destructive" : "text-foreground"
            )}
          >
            {isNegativeUSD && "-"}{formatAmount(holder.balanceUSD, "$")}
          </span>
          <span className="min-w-[60px] text-right">
            {holder.pendingInUSD > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5 tabular-nums">
                <TrendingUp className="h-3 w-3" />
                +{formatAmount(holder.pendingInUSD, "$")}
              </span>
            )}
          </span>
          <span className="min-w-[60px] text-right">
            {holder.pendingOutUSD > 0 && (
              <span className="text-xs text-destructive inline-flex items-center gap-0.5 tabular-nums">
                <TrendingDown className="h-3 w-3" />
                -{formatAmount(holder.pendingOutUSD, "$")}
              </span>
            )}
          </span>
        </div>

        {/* GEL Balance */}
        <div className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">GEL</span>
          <span
            className={cn(
              "text-lg font-bold tabular-nums text-right",
              isNegativeGEL ? "text-destructive" : "text-foreground"
            )}
          >
            {isNegativeGEL && "-"}{formatAmount(holder.balanceGEL, "₾")}
          </span>
          <span className="min-w-[60px] text-right">
            {holder.pendingInGEL > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5 tabular-nums">
                <TrendingUp className="h-3 w-3" />
                +{formatAmount(holder.pendingInGEL, "₾")}
              </span>
            )}
          </span>
          <span className="min-w-[60px] text-right">
            {holder.pendingOutGEL > 0 && (
              <span className="text-xs text-destructive inline-flex items-center gap-0.5 tabular-nums">
                <TrendingDown className="h-3 w-3" />
                -{formatAmount(holder.pendingOutGEL, "₾")}
              </span>
            )}
          </span>
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
