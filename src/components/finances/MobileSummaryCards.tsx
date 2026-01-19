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
      <span className="text-base font-bold tracking-tight text-muted-foreground/40">
        $0
      </span>
    );
  }

  const usdAbs = Math.abs(value.USD);
  const gelAbs = Math.abs(value.GEL);
  const showUSDPrimary = usdAbs >= gelAbs || !hasGEL;

  if (hasUSD && hasGEL) {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-base font-bold tracking-tight", valueColor)}>
          {formatValue(showUSDPrimary ? value.USD : value.GEL, showUSDPrimary ? "$" : "₾")}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {formatValue(showUSDPrimary ? value.GEL : value.USD, showUSDPrimary ? "₾" : "$")}
        </span>
      </div>
    );
  }

  return (
    <span className={cn("text-base font-bold tracking-tight", valueColor)}>
      {hasUSD ? formatValue(value.USD, "$") : formatValue(value.GEL, "₾")}
    </span>
  );
}

export function MobileSummaryCards({
  received,
  expenses,
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
    <div className="grid grid-cols-3 gap-2">
      {cards.map((card) => {
        const IconComponent = card.icon;
        
        return (
          <div
            key={card.label}
            className="bg-card border border-border/50 rounded-lg p-2.5"
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex-shrink-0 p-1.5 rounded-md",
                card.iconBg
              )}>
                <IconComponent className={cn("h-3.5 w-3.5", card.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground">
                  {card.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-4 w-12" />
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
