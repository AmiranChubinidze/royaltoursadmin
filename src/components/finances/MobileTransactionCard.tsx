import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Clock } from "lucide-react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GEL: "₾",
};

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  currency?: string;
  date: string;
  description: string | null;
  notes?: string | null;
  is_paid: boolean;
  confirmation_id: string | null;
}

interface MobileTransactionCardProps {
  transaction: Transaction;
  onTogglePaid?: (id: string, currentStatus: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  tour_payment: "Tour",
  driver: "Driver",
  fuel: "Fuel",
  meals: "Meals",
  hotel: "Hotel",
  guide: "Guide",
  tickets: "Tickets",
  transport: "Transport",
  office: "Office",
  marketing: "Marketing",
  transfer_internal: "Transfer",
  reimbursement: "Reimbursement",
  deposit: "Bank Deposit",
  currency_exchange: "Exchange",
  other: "Other",
};

export function MobileTransactionCard({
  transaction,
  onTogglePaid,
}: MobileTransactionCardProps) {
  const isIncome = transaction.type === "income";
  const isExchange = transaction.category === "currency_exchange";
  const currencySymbol = CURRENCY_SYMBOLS[transaction.currency || "USD"] || "$";
  const formattedAmount = `${currencySymbol}${Math.round(transaction.amount).toLocaleString()}`;
  const formattedDate = (() => {
    try {
      return format(new Date(transaction.date), "MMM d");
    } catch {
      return transaction.date;
    }
  })();

  // For exchange transactions, compute the GEL amount from notes (format: "Rate: X.XX")
  const gelAmount = (() => {
    if (!isExchange || transaction.currency !== "USD") return null;
    const notes = (transaction as any).notes;
    if (!notes) return null;
    const match = notes.match(/Rate:\s*([\d.]+)/i);
    if (match) {
      const rate = parseFloat(match[1]);
      return Math.round(transaction.amount * rate);
    }
    return null;
  })();

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Left side: Icon + Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "p-2 rounded-lg flex-shrink-0",
              isExchange
                ? "bg-purple-500/10"
                : isIncome
                  ? "bg-emerald-500/10"
                  : "bg-red-500/10"
            )}
          >
            {isIncome ? (
              <ArrowDownLeft className={cn("h-4 w-4", isExchange ? "text-purple-600" : "text-emerald-600")} />
            ) : (
              <ArrowUpRight className={cn("h-4 w-4", isExchange ? "text-purple-600" : "text-red-600")} />
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
              isExchange
                ? "text-purple-600"
                : isIncome
                  ? "text-emerald-600"
                  : "text-red-600"
            )}
          >
            {isIncome ? "+" : "-"}{formattedAmount}
          </p>
          {isExchange && gelAmount && (
            <p className="text-sm text-purple-500 font-medium">
              = ₾{gelAmount.toLocaleString()}
            </p>
          )}
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