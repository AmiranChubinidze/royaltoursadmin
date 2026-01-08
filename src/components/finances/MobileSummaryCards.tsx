import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingDown, DollarSign, Clock, Wallet } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface MobileSummaryCardsProps {
  received: number;
  expenses: number;
  profit: number;
  pending: number;
  isLoading?: boolean;
}

export function MobileSummaryCards({
  received,
  expenses,
  profit,
  pending,
  isLoading = false,
}: MobileSummaryCardsProps) {
  const { formatAmount } = useCurrency();
  
  const cards = [
    {
      label: "Received",
      value: received,
      icon: Wallet,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Expenses",
      value: expenses,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Profit",
      value: profit,
      icon: DollarSign,
      color: profit >= 0 ? "text-emerald-600" : "text-red-600",
      bgColor: profit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      color: "text-amber-600",
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
              <card.icon className={cn("h-3.5 w-3.5", card.color)} />
            </div>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <p className={cn("text-lg font-bold", card.color)}>
              {formatAmount(card.value)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
