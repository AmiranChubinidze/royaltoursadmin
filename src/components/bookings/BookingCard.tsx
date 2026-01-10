import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Circle,
  Clock,
  TrendingDown
} from "lucide-react";
import { BookingRow } from "./types";
import { Transaction } from "@/hooks/useTransactions";

interface BookingCardProps {
  booking: BookingRow;
  onAddPayment: (bookingId: string) => void;
  onAddExpense: (bookingId: string) => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GEL: "₾",
};

const formatTransactionAmount = (amount: number, currency?: string): string => {
  const symbol = CURRENCY_SYMBOLS[currency || "USD"] || "$";
  return `${symbol}${Math.round(amount).toLocaleString()}`;
};

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    tour_payment: "Tour Payment",
    hotel: "Hotel",
    driver: "Driver",
    sim: "SIM",
    breakfast: "Breakfast",
    fuel: "Fuel",
    guide: "Guide",
    salary: "Salary",
    other: "Other",
  };
  return labels[category] || category;
};

function TransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-xs text-muted-foreground w-14 shrink-0">
          {format(new Date(transaction.date), "MMM d")}
        </span>
        <Badge variant="outline" className="text-xs shrink-0">
          {getCategoryLabel(transaction.category)}
        </Badge>
        {transaction.responsible_holder?.name && (
          <span className="text-xs text-muted-foreground shrink-0">
            {transaction.responsible_holder.name}
          </span>
        )}
        <span className="text-xs text-muted-foreground truncate">
          {transaction.description}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          "text-sm font-medium",
          transaction.kind === "in" ? "text-emerald-600" : "text-red-600"
        )}>
          {transaction.kind === "in" ? "+" : "-"}
          {formatTransactionAmount(transaction.amount, transaction.currency)}
        </span>
        {transaction.status === "pending" && (
          <Clock className="h-3 w-3 text-amber-500" />
        )}
      </div>
    </div>
  );
}

export function BookingCard({ booking, onAddPayment, onAddExpense }: BookingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { formatAmount } = useCurrency();

  const paymentProgress = booking.revenue > 0 
    ? Math.min(100, (booking.received / booking.revenue) * 100) 
    : 0;

  const StatusIcon = booking.status === "paid" 
    ? CheckCircle2 
    : booking.status === "partial" 
    ? AlertCircle 
    : Circle;

  const statusText = booking.status === "paid" 
    ? "PAID" 
    : booking.status === "partial" 
    ? "PARTIAL" 
    : "UNPAID";

  const statusColor = booking.status === "paid"
    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
    : booking.status === "partial"
    ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
    : "text-red-600 bg-red-50 dark:bg-red-900/20";

  const inTransactions = booking.transactions.filter((t) => t.kind === "in");
  const outTransactions = booking.transactions.filter((t) => t.kind === "out");

  return (
    <div 
      className={cn(
        "bg-card border rounded-xl overflow-hidden transition-all",
        isExpanded && "ring-2 ring-primary/20"
      )}
    >
      {/* Main Card Content */}
      <div 
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Top Row: Client + Code / Date + Days */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-foreground">
              {booking.client || "—"}
            </p>
            <p className="text-xs font-mono text-muted-foreground">
              {booking.code}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-foreground">
              {booking.arrivalDate}
            </p>
            <p className="text-xs text-muted-foreground">
              {booking.days} {booking.days === 1 ? "day" : "days"}
            </p>
          </div>
        </div>

        {/* NET as largest number */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">NET</p>
            <p className={cn(
              "text-2xl font-bold",
              booking.net >= 0 ? "text-foreground" : "text-red-600"
            )}>
              {formatAmount(booking.net)}
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            statusColor
          )}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusText}
          </div>
        </div>

        {/* Compact line: Revenue | Expenses | Received | Remaining */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>Rev: {formatAmount(booking.revenue)}</span>
          <span className="text-border">|</span>
          <span className="text-red-600">Exp: {formatAmount(booking.expenses)}</span>
          <span className="text-border">|</span>
          <span className="text-emerald-600">Rec: {formatAmount(booking.received)}</span>
          <span className="text-border">|</span>
          <span>Rem: {formatAmount(booking.remaining)}</span>
        </div>

        {/* Progress bar */}
        <Progress value={paymentProgress} className="h-1.5 mb-3" />

        {/* Problem tags */}
        {(booking.hasPending || booking.hasNegativeNet) && (
          <div className="flex gap-1.5 mb-3">
            {booking.hasPending && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                <Clock className="h-3 w-3 mr-1" />
                PENDING
              </Badge>
            )}
            {booking.hasNegativeNet && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                <TrendingDown className="h-3 w-3 mr-1" />
                NEGATIVE
              </Badge>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-8 text-xs"
            onClick={() => onAddPayment(booking.id)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Payment
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-8 text-xs"
            onClick={() => onAddExpense(booking.id)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Expense
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t bg-muted/20 p-4 space-y-4">
          {/* Payments Section */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Payments ({inTransactions.length})
            </h4>
            {inTransactions.length > 0 ? (
              <div className="bg-card rounded-lg border p-2">
                {inTransactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No payments yet</p>
            )}
          </div>

          {/* Expenses Section */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Expenses ({outTransactions.length})
            </h4>
            {outTransactions.length > 0 ? (
              <div className="bg-card rounded-lg border p-2">
                {outTransactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No expenses yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
