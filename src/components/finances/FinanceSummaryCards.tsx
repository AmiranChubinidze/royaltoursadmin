import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Wallet,
} from "lucide-react";

interface FinanceSummaryCardsProps {
  revenueExpected: number;
  received: number;
  expenses: number;
  profit: number;
  pending: number;
  isLoading?: boolean;
}

export function FinanceSummaryCards({
  revenueExpected,
  received,
  expenses,
  profit,
  pending,
  isLoading = false,
}: FinanceSummaryCardsProps) {
  const cards = [
    {
      label: "Revenue (Expected)",
      value: revenueExpected,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Received (Cash In)",
      value: received,
      icon: Wallet,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Expenses (Cash Out)",
      value: expenses,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Profit (Actual)",
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className={cn("p-2.5 rounded-lg", card.bgColor)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {card.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <p className={cn("text-xl font-bold mt-0.5", card.color)}>
                    ${card.value.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
