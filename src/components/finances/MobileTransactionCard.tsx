import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Clock } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  is_paid: boolean;
  confirmation_id: string | null;
}

interface MobileTransactionCardProps {
  transaction: Transaction;
  onTogglePaid?: (id: string, currentStatus: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  tour_payment: "Tour Payment",
  driver: "Driver",
  fuel: "Fuel",
  meals: "Meals",
  hotel: "Hotel",
  guide: "Guide",
  tickets: "Tickets",
  transport: "Transport",
  office: "Office",
  marketing: "Marketing",
  other: "Other",
};

export function MobileTransactionCard({
  transaction,
  onTogglePaid,
}: MobileTransactionCardProps) {
  const { formatAmount } = useCurrency();
  const isIncome = transaction.type === "income";
  const formattedDate = (() => {
    try {
      return format(new Date(transaction.date), "MMM d");
    } catch {
      return transaction.date;
    }
  })();

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Left side: Icon + Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "p-2 rounded-lg flex-shrink-0",
              isIncome ? "bg-emerald-500/10" : "bg-red-500/10"
            )}
          >
            {isIncome ? (
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            ) : (
              <ArrowUpRight className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {CATEGORY_LABELS[transaction.category] || transaction.category}
            </p>
            {transaction.description && (
              <p className="text-sm text-muted-foreground truncate">
                {transaction.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{formattedDate}</p>
          </div>
        </div>

        {/* Right side: Amount + Status */}
        <div className="text-right flex-shrink-0">
          <p
            className={cn(
              "font-bold text-lg",
              isIncome ? "text-emerald-600" : "text-red-600"
            )}
          >
            {isIncome ? "+" : "-"}{formatAmount(transaction.amount)}
          </p>
          <button
            onClick={() => onTogglePaid?.(transaction.id, transaction.is_paid)}
            className={cn(
              "inline-flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-full transition-colors",
              transaction.is_paid
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-amber-500/10 text-amber-600"
            )}
          >
            {transaction.is_paid ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Paid
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                Pending
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
