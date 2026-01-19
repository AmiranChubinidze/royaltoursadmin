import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  TrendingDown,
  DollarSign,
  Clock,
  Wallet,
  LucideIcon,
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
      <p className="text-xl font-bold text-muted-foreground/50">$0</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {hasUSD && (
        <p className={cn("text-xl font-bold", getColor(value.USD))}>
          {formatCurrencyValue(value.USD, "$")}
        </p>
      )}
      {hasGEL && (
        <p className={cn(
          "font-semibold",
          hasUSD ? "text-sm" : "text-xl",
          getColor(value.GEL)
        )}>
          {formatCurrencyValue(value.GEL, "₾")}
        </p>
      )}
    </div>
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
      getColor: () => "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Expenses (Cash Out)",
      value: expenses,
      icon: TrendingDown,
      getColor: () => "text-red-600",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Profit (Actual)",
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className={cn("p-2.5 rounded-lg", card.bgColor)}>
                <card.icon className={cn("h-5 w-5", card.getColor(card.value.USD + card.value.GEL))} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {card.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <div className="mt-0.5">
                    <CurrencyDisplay value={card.value} getColor={card.getColor} />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
