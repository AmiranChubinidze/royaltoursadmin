import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  TrendingDown,
  Clock,
  Wallet,
  type LucideIcon,
} from "lucide-react";

interface CurrencyValue {
  USD: number;
  GEL: number;
}

interface FinanceSummaryCardsProps {
  received: CurrencyValue;
  expenses: CurrencyValue;
  profit: CurrencyValue;
  pending: CurrencyValue;
  exchangeRateEffective?: number;
  profitAdjusted?: CurrencyValue;
  isLoading?: boolean;
}

interface CardConfig {
  label: string;
  value: CurrencyValue;
  icon: LucideIcon;
  dotColor: string;
  iconColor: string;
  iconBg: string;
  valueColor: string;
}

function formatValue(value: number, symbol: string): string {
  const formatted = Math.abs(Math.round(value)).toLocaleString();
  return `${value < 0 ? "−" : ""}${symbol}${formatted}`;
}

function ValueDisplay({ 
  value, 
  valueColor 
}: { 
  value: CurrencyValue; 
  valueColor: string;
}) {
  const hasUSD = value.USD !== 0;
  const hasGEL = value.GEL !== 0;

  if (!hasUSD && !hasGEL) {
    return (
      <span className="text-lg font-bold tracking-tight text-muted-foreground/40">
        $0
      </span>
    );
  }

  const usdAbs = Math.abs(value.USD);
  const gelAbs = Math.abs(value.GEL);
  const showUSDPrimary = usdAbs >= gelAbs || !hasGEL;

  if (hasUSD && hasGEL) {
    const usdText = formatValue(value.USD, "$");
    const gelText = formatValue(value.GEL, "₾");
    return (
      <div className="flex items-baseline gap-2">
        <span className={cn("text-lg font-bold tracking-tight", valueColor)}>
          {usdText}
        </span>
        <span className={cn("text-lg font-bold tracking-tight", valueColor)}>
          / {gelText}
        </span>
      </div>
    );
  }

  return (
    <span className={cn("text-lg font-bold tracking-tight", valueColor)}>
      {hasUSD ? formatValue(value.USD, "$") : formatValue(value.GEL, "₾")}
    </span>
  );
}

export function FinanceSummaryCards({
  received,
  expenses,
  profit,
  pending,
  exchangeRateEffective,
  profitAdjusted,
  isLoading = false,
}: FinanceSummaryCardsProps) {
  const { exchangeRate } = useCurrency();
  const rate = exchangeRateEffective ?? exchangeRate.gel_to_usd;
  const actualProfitUSD = profit.USD + profit.GEL * rate;
  const adjusted = profitAdjusted ?? profit;

  const cards: CardConfig[] = [
    {
      label: "Received",
      value: received,
      icon: Wallet,
      dotColor: "bg-emerald-500",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      valueColor: "text-foreground",
    },
    {
      label: "Expenses",
      value: expenses,
      icon: TrendingDown,
      dotColor: "bg-red-500",
      iconColor: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-500/10",
      valueColor: "text-foreground",
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      dotColor: "bg-amber-500",
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
      valueColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((card) => {
        const IconComponent = card.icon;
        
        return (
          <Card 
            key={card.label} 
            className="border-border/60 bg-card/80 shadow-[0_1px_2px_0_hsl(210_20%_20%/0.04)]"
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                {/* Colored dot indicator */}
                <div className={cn(
                  "flex-shrink-0 h-3 w-3 rounded-full",
                  card.dotColor
                )} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                    {card.label}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <ValueDisplay value={card.value} valueColor={card.valueColor} />
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <Card className="border-border/60 bg-card/80 shadow-[0_1px_2px_0_hsl(210_20%_20%/0.04)]">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-3 w-3 rounded-full bg-emerald-500" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                Profit
              </p>
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold tracking-tight text-emerald-600">
                    {formatValue(actualProfitUSD, "$")}
                  </span>
                  <span className="text-sm font-semibold text-emerald-600/80">
                    {formatValue(adjusted.USD, "$")} / {formatValue(adjusted.GEL, "₾")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
