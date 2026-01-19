import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Wallet, 
  LucideIcon,
  Minus 
} from "lucide-react";

interface CurrencyValue {
  USD: number;
  GEL: number;
}

interface MobileSummaryCardsProps {
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
      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
      styles[type]
    )}>
      <Icon className="h-2.5 w-2.5" />
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
      <span className="text-xl font-bold tracking-tight text-muted-foreground/40">
        $0
      </span>
    );
  }

  const usdAbs = Math.abs(value.USD);
  const gelAbs = Math.abs(value.GEL);
  const showUSDPrimary = usdAbs >= gelAbs || !hasGEL;

  if (hasUSD && hasGEL) {
    return (
      <div className="space-y-0">
        <span className={cn("text-xl font-bold tracking-tight block", valueColor)}>
          {formatValue(showUSDPrimary ? value.USD : value.GEL, showUSDPrimary ? "$" : "₾")}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {formatValue(showUSDPrimary ? value.GEL : value.USD, showUSDPrimary ? "₾" : "$")}
        </span>
      </div>
    );
  }

  return (
    <span className={cn("text-xl font-bold tracking-tight", valueColor)}>
      {hasUSD ? formatValue(value.USD, "$") : formatValue(value.GEL, "₾")}
    </span>
  );
}

export function MobileSummaryCards({
  received,
  expenses,
  profit,
  pending,
  isLoading = false,
}: MobileSummaryCardsProps) {
  const cards: CardConfig[] = [
    {
      label: "Received",
      value: received,
      icon: Wallet,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      valueColor: "text-foreground",
      getDelta: () => {
        const total = received.USD + received.GEL;
        if (total > 0) return { value: "Active", type: "positive" };
        return null;
      },
    },
    {
      label: "Expenses",
      value: expenses,
      icon: TrendingDown,
      iconColor: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-500/10",
      valueColor: "text-foreground",
      getDelta: () => null,
    },
    {
      label: "Profit",
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
        if (total > 0) return { value: "↑", type: "positive" };
        if (total < 0) return { value: "↓", type: "negative" };
        return null;
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
        if (total <= 0) return { value: "✓", type: "positive" };
        return null;
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => {
        const delta = card.getDelta();
        
        return (
          <div
            key={card.label}
            className="relative bg-card border border-border/50 rounded-xl p-3 overflow-hidden"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 p-2 rounded-lg",
                card.iconBg
              )}>
                <card.icon className={cn("h-4 w-4", card.iconColor)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-0.5">
                {/* Label + Delta */}
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {card.label}
                  </p>
                  {!isLoading && delta && (
                    <DeltaBadge value={delta.value} type={delta.type} />
                  )}
                </div>

                {/* Value */}
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <ValueDisplay value={card.value} valueColor={card.valueColor} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
