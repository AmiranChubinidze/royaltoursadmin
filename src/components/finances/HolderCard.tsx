import { format } from "date-fns";
import { Wallet, TrendingUp, TrendingDown, Clock, ArrowRight } from "lucide-react";
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
  
  const isNegativeUSD = holder.balanceUSD < 0;
  const isNegativeGEL = holder.balanceGEL < 0;
  const hasAnyNegative = isNegativeUSD || isNegativeGEL;
  
  // Combined totals in both currencies
  const totalInUSD = holder.balanceUSD + (holder.balanceGEL * GEL_TO_USD_RATE);
  const totalInGEL = holder.balanceGEL + (holder.balanceUSD * USD_TO_GEL_RATE);
  const isTotalNegative = totalInUSD < 0;

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group bg-card border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 hover:-translate-y-0.5",
        hasAnyNegative 
          ? "border-destructive/40 bg-gradient-to-br from-destructive/5 to-transparent" 
          : "border-border/60"
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl transition-colors",
            hasAnyNegative 
              ? "bg-destructive/10 text-destructive" 
              : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
          )}>
            <Wallet className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-foreground">{holder.name}</h3>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>

      {/* Balances */}
      <div className="px-4 pb-4">
        <div className="bg-muted/40 rounded-xl p-3 space-y-2">
          {/* USD Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-8">USD</span>
              <span className={cn(
                "text-xl font-bold tabular-nums",
                isNegativeUSD ? "text-destructive" : "text-foreground"
              )}>
                {isNegativeUSD && "−"}${formatAmount(holder.balanceUSD)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {holder.pendingInUSD > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md tabular-nums">
                  <TrendingUp className="h-3 w-3" />
                  +${formatAmount(holder.pendingInUSD)}
                </span>
              )}
              {holder.pendingOutUSD > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md tabular-nums">
                  <TrendingDown className="h-3 w-3" />
                  −${formatAmount(holder.pendingOutUSD)}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* GEL Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-8">GEL</span>
              <span className={cn(
                "text-xl font-bold tabular-nums",
                isNegativeGEL ? "text-destructive" : "text-foreground"
              )}>
                {isNegativeGEL && "−"}₾{formatAmount(holder.balanceGEL)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {holder.pendingInGEL > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md tabular-nums">
                  <TrendingUp className="h-3 w-3" />
                  +₾{formatAmount(holder.pendingInGEL)}
                </span>
              )}
              {holder.pendingOutGEL > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md tabular-nums">
                  <TrendingDown className="h-3 w-3" />
                  −₾{formatAmount(holder.pendingOutGEL)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Combined Total */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {holder.lastActivity ? (
              <>
                <Clock className="h-3 w-3" />
                <span>{format(new Date(holder.lastActivity), "MMM d")}</span>
              </>
            ) : (
              <span className="text-muted-foreground/50">No activity</span>
            )}
          </div>
          <div className={cn(
            "font-semibold tabular-nums",
            isTotalNegative ? "text-destructive" : "text-muted-foreground"
          )}>
            {isTotalNegative && "−"}
            ${formatAmount(totalInUSD)} 
            <span className="text-muted-foreground/40 mx-1">≈</span>
            ₾{formatAmount(totalInGEL)}
          </div>
        </div>
      </div>
    </div>
  );
}
