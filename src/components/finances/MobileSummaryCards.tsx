import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingDown, DollarSign, Clock, Wallet, LucideIcon } from "lucide-react";

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
  getColor: (val: number) => string;
  bgColor: string;
}

function formatCurrencyValue(value: number, symbol: string): string {
  const formatted = Math.abs(Math.round(value)).toLocaleString();
  return `${value < 0 ? "−" : ""}${symbol}${formatted}`;
}

function CurrencyDisplay({ 
  value, 
  getColor 
}: { 
  value: CurrencyValue; 
  getColor: (val: number) => string;
}) {
  const hasUSD = value.USD !== 0;
  const hasGEL = value.GEL !== 0;

  if (!hasUSD && !hasGEL) {
    return (
      <p className="text-lg font-bold text-muted-foreground/50">$0</p>
    );
  }

  return (
    <div className="space-y-0">
      {hasUSD && (
        <p className={cn("text-lg font-bold", getColor(value.USD))}>
          {formatCurrencyValue(value.USD, "$")}
        </p>
      )}
      {hasGEL && (
        <p className={cn(
          "font-semibold",
          hasUSD ? "text-xs" : "text-lg",
          getColor(value.GEL)
        )}>
          {formatCurrencyValue(value.GEL, "₾")}
        </p>
      )}
    </div>
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
      getColor: () => "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Expenses",
      value: expenses,
      icon: TrendingDown,
      getColor: () => "text-red-600",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Profit",
      value: profit,
      icon: DollarSign,
      getColor: (val: number) => val >= 0 ? "text-emerald-600" : "text-red-600",
      bgColor: profit.USD >= 0 && profit.GEL >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      getColor: () => "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card border border-border rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={cn("p-1.5 rounded-lg", card.bgColor)}>
              <card.icon className={cn("h-3.5 w-3.5", card.getColor(card.value.USD + card.value.GEL))} />
            </div>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <CurrencyDisplay value={card.value} getColor={card.getColor} />
          )}
        </div>
      ))}
    </div>
  );
}
