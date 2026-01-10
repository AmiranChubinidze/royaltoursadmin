import { useCurrency } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KPIStripProps {
  received: number;
  expenses: number;
  profit: number;
  pending: number;
  bookingsCount: number;
  transactionsCount: number;
  isLoading: boolean;
}

export function KPIStrip({
  received,
  expenses,
  profit,
  pending,
  bookingsCount,
  transactionsCount,
  isLoading,
}: KPIStripProps) {
  const { formatAmount } = useCurrency();

  const kpis = [
    {
      label: "Received",
      value: received,
      count: transactionsCount,
      countLabel: "tx",
      color: "text-emerald-600",
    },
    {
      label: "Expenses",
      value: expenses,
      count: transactionsCount,
      countLabel: "tx",
      color: "text-red-600",
    },
    {
      label: "Profit",
      value: profit,
      count: bookingsCount,
      countLabel: "bookings",
      color: profit >= 0 ? "text-blue-600" : "text-red-600",
    },
    {
      label: "Pending",
      value: pending,
      count: bookingsCount,
      countLabel: "bookings",
      color: "text-amber-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3 px-4 py-3 bg-muted/30 border-b">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3 px-4 py-3 bg-muted/30 border-b">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="text-center">
          <p className="text-xs text-muted-foreground">{kpi.label}</p>
          <p className={cn("text-lg font-bold", kpi.color)}>
            {formatAmount(kpi.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
