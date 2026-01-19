import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  isLoading?: boolean;
}

interface CardConfig {
  label: string;
  value: CurrencyValue;
  icon: LucideIcon;
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
    return (
      <div className="flex items-baseline gap-2">
        <span className={cn("text-lg font-bold tracking-tight", valueColor)}>
          {formatValue(showUSDPrimary ? value.USD : value.GEL, showUSDPrimary ? "$" : "₾")}
        </span>
        <span className="text-sm font-semibold text-muted-foreground">
          {formatValue(showUSDPrimary ? value.GEL : value.USD, showUSDPrimary ? "₾" : "$")}
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
  pending,
  isLoading = false,
}: FinanceSummaryCardsProps) {
  const cards: CardConfig[] = [
    {
      label: "Received",
      value: received,
      icon: Wallet,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      valueColor: "text-foreground",
    },
    {
      label: "Expenses",
      value: expenses,
      icon: TrendingDown,
      iconColor: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-500/10",
      valueColor: "text-foreground",
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
      valueColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => {
        const IconComponent = card.icon;
        
        return (
          <Card 
            key={card.label} 
            className="border-border/50 bg-card"
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 p-2 rounded-lg",
                  card.iconBg
                )}>
                  <IconComponent className={cn("h-4 w-4", card.iconColor)} />
                </div>

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
    </div>
  );
}
