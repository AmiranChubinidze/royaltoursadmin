import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CheckCircle, Clock, Pencil } from "lucide-react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GEL: "\u20be",
};

interface Transaction {
  id: string;
  type: string;
  kind?: string;
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
  onEdit?: (id: string) => void;
  canTogglePaid?: boolean;
  canEdit?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  tour_payment: "Tour",
  orbi: "Orbi",
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
  onEdit,
  canTogglePaid = true,
  canEdit = true,
}: MobileTransactionCardProps) {
  const isIncome = transaction.type === "income";
  const isTransfer = transaction.kind === "transfer" || transaction.category === "transfer_internal";
  const isExchange = transaction.kind === "exchange" || transaction.category === "currency_exchange";
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
    if (!transaction.notes) return null;
    const match = transaction.notes.match(/Rate:\s*([\d.]+)/i);
    if (!match) return null;
    const rate = parseFloat(match[1]);
    return Number.isFinite(rate) ? Math.round(transaction.amount * rate) : null;
  })();

  return (
    <div className="rounded-2xl border border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#F6FBFD] p-3.5 shadow-[0_8px_18px_rgba(15,76,92,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={cn(
              "flex-shrink-0 rounded-lg p-2",
              isExchange ? "bg-purple-500/12" : isTransfer ? "bg-blue-500/12" : isIncome ? "bg-emerald-500/12" : "bg-red-500/12"
            )}
          >
            {isExchange ? (
              <ArrowLeftRight className="h-4 w-4 text-purple-700" />
            ) : isTransfer ? (
              <ArrowLeftRight className="h-4 w-4 text-blue-700" />
            ) : isIncome ? (
              <ArrowDownLeft className="h-4 w-4 text-emerald-700" />
            ) : (
              <ArrowUpRight className="h-4 w-4 text-red-700" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-foreground">
              {CATEGORY_LABELS[transaction.category] || transaction.category}
            </p>
            {transaction.description && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {transaction.description}
              </p>
            )}
            <p className="mt-1 text-[11px] font-medium text-[#0F4C5C]/50">{formattedDate}</p>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <p
            className={cn(
              "text-lg font-bold tracking-tight",
              isExchange ? "text-purple-700" : isTransfer ? "text-blue-700" : isIncome ? "text-emerald-700" : "text-red-700"
            )}
          >
            {isIncome ? "+" : isTransfer ? "" : "-"}
            {formattedAmount}
          </p>
          {isExchange && gelAmount && (
            <p className="text-sm font-medium text-purple-600">
              = {"\u20be"}
              {gelAmount.toLocaleString()}
            </p>
          )}
          <button
            onClick={() => canTogglePaid && onTogglePaid?.(transaction.id, transaction.is_paid)}
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
              transaction.is_paid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600",
              !canTogglePaid && "cursor-not-allowed opacity-50"
            )}
            disabled={!canTogglePaid}
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

      {onEdit && canEdit && (
        <div className="mt-2 flex justify-start border-t border-[#0F4C5C]/10 pt-2">
          <button
            onClick={() => onEdit(transaction.id)}
            className="inline-flex items-center gap-1.5 text-xs text-[#0F4C5C]/60 transition-colors hover:text-[#0F4C5C]"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit</span>
          </button>
        </div>
      )}
    </div>
  );
}
