import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Clock,
  Wallet,
  LucideIcon,
  Minus,
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
  getDelta: () => { value: string; type: "positive" | "negative" | "neutral" } | null;
}

function formatValue(value: number, symbol: string): string {
  const formatted = Math.abs(Math.round(value)).toLocaleString();
  return `${value < 0 ? "−" : ""}${symbol}${formatted}`;
}

function DeltaBadge({ 
  value, 
  type 
}: { 
  value: string; 
  type: "positive" | "negative" | "neutral";
}) {
  const styles = {
    positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    negative: "bg-red-500/10 text-red-600 dark:text-red-400",
    neutral: "bg-muted text-muted-foreground",
  };

  const Icon = type === "positive" ? TrendingUp : type === "negative" ? TrendingDown : Minus;

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      styles[type]
    )}>
      <Icon className="h-3 w-3" />
      <span>{value}</span>
    </div>
  );
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
      <span className="text-2xl font-bold tracking-tight text-muted-foreground/40">
        $0
      </span>
    );
  }

  // Primary value is the larger one, or USD if equal
  const usdAbs = Math.abs(value.USD);
  const gelAbs = Math.abs(value.GEL);
  const showUSDPrimary = usdAbs >= gelAbs || !hasGEL;

  if (hasUSD && hasGEL) {
    return (
      <div className="flex items-baseline gap-2">
        <span className={cn("text-2xl font-bold tracking-tight", valueColor)}>
          {formatValue(showUSDPrimary ? value.USD : value.GEL, showUSDPrimary ? "$" : "₾")}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {formatValue(showUSDPrimary ? value.GEL : value.USD, showUSDPrimary ? "₾" : "$")}
        </span>
      </div>
    );
  }

  return (
    <span className={cn("text-2xl font-bold tracking-tight", valueColor)}>
      {hasUSD ? formatValue(value.USD, "$") : formatValue(value.GEL, "₾")}
    </span>
  );
}

export function FinanceSummaryCards({
  received,
  expenses,
  profit,
  pending,
  isLoading = false,
}: FinanceSummaryCardsProps) {
  const cards: CardConfig[] = [
    {
      label: "Received (Cash In)",
      value: received,
      icon: Wallet,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      valueColor: "text-foreground",
      getDelta: () => {
        const total = received.USD + received.GEL;
        if (total > 0) return { value: "Active", type: "positive" };
        return { value: "No income", type: "neutral" };
      },
    },
    {
      label: "Expenses (Cash Out)",
      value: expenses,
      icon: TrendingDown,
      iconColor: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-500/10",
      valueColor: "text-foreground",
      getDelta: () => {
        const total = expenses.USD + expenses.GEL;
        if (total > 0) return { value: "Tracked", type: "neutral" };
        return { value: "No expenses", type: "neutral" };
      },
    },
    {
      label: "Profit (Actual)",
      value: profit,
      icon: DollarSign,
      iconColor: profit.USD + profit.GEL >= 0 
        ? "text-emerald-600 dark:text-emerald-400" 
        : "text-red-600 dark:text-red-400",
      iconBg: profit.USD + profit.GEL >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      valueColor: profit.USD + profit.GEL >= 0 
        ? "text-emerald-600 dark:text-emerald-400" 
        : "text-red-600 dark:text-red-400",
      getDelta: () => {
        const total = profit.USD + profit.GEL;
        if (total > 0) return { value: "Profitable", type: "positive" };
        if (total < 0) return { value: "Loss", type: "negative" };
        return { value: "Break-even", type: "neutral" };
      },
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
      valueColor: "text-amber-600 dark:text-amber-400",
      getDelta: () => {
        const total = pending.USD + pending.GEL;
        if (total > 0) return { value: "Awaiting", type: "neutral" };
        return { value: "All received", type: "positive" };
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const delta = card.getDelta();
        
        return (
          <Card 
            key={card.label} 
            className="relative overflow-hidden border-border/50 bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 p-3 rounded-xl",
                  card.iconBg
                )}>
                  <card.icon className={cn("h-5 w-5", card.iconColor)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Label */}
                  <p className="text-sm font-medium text-muted-foreground truncate">
                    {card.label}
                  </p>

                  {/* Value */}
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <ValueDisplay value={card.value} valueColor={card.valueColor} />
                  )}

                  {/* Delta Badge */}
                  {!isLoading && delta && (
                    <div className="pt-1">
                      <DeltaBadge value={delta.value} type={delta.type} />
                    </div>
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
