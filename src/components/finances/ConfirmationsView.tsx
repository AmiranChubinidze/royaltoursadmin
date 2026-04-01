import { useEffect, useMemo, useRef, useState } from "react";
import { format, isWithinInterval, isPast, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Download,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useBulkCreateTransactions, useTransactions, Transaction } from "@/hooks/useTransactions";
import { useExpenseRules } from "@/hooks/useExpenseRules";
import { useSavedHotels } from "@/hooks/useSavedData";
import { countHotelNights } from "@/lib/confirmationUtils";
import { useExpenses } from "@/hooks/useExpenses";
import { useHolders } from "@/hooks/useHolders";
import { TransactionModal } from "./TransactionModal";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { FinanceSearch } from "./FinanceSearch";
import { StatusBadge } from "./StatusBadge";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GEL: "₾",
};

// Format transaction amount in its original currency (no conversion)
const formatTransactionAmount = (amount: number, currency?: string): string => {
  const symbol = CURRENCY_SYMBOLS[currency || "USD"] || "$";
  return `${symbol}${Math.round(amount).toLocaleString()}`;
};

interface ConfirmationsViewProps {
  dateFrom?: Date;
  dateTo?: Date;
}

const isoDateFromDdMmYyyy = (dateStr: string | null | undefined) => {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
};

interface ConfirmationRow {
  id: string;
  code: string;
  client: string | null;
  responsibleHolderId: string | null;
  arrivalDate: string | null;
  days: number;
  revenueExpected: number;
  received: number;
  pending: number;
  expenses: number;
  profit: number;
  clientPaid: boolean;
  hotelsPaid: boolean;
  invoiceExpenses: { name: string; amount: number }[];
  transactions: Transaction[];
}

export function ConfirmationsView({ dateFrom, dateTo }: ConfirmationsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: confirmations, isLoading: confirmationsLoading } = useConfirmations();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({ dateFrom, dateTo });
  const { data: allTransactionsForAutogen } = useTransactions();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const { data: holders } = useHolders();
  const { formatAmount, symbol, exchangeRate } = useCurrency();

  // Convert amount to USD (base currency) for consistent summing
  const toUSD = (amount: number, currency?: string): number => {
    if (currency === "GEL") {
      return amount * exchangeRate.gel_to_usd;
    }
    return amount; // Already USD
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfirmationId, setModalConfirmationId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const bulkCreateTransactions = useBulkCreateTransactions();
  const { data: expenseRules } = useExpenseRules();
  const { data: savedHotels = [] } = useSavedHotels();
  const createdRulesRef = useRef<Set<string>>(new Set());

  const isLoading = confirmationsLoading || transactionsLoading || expensesLoading;

  // Parse date from DD/MM/YYYY format
  const parseConfirmationDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  // Build confirmation rows with computed values
  const confirmationRows = useMemo<ConfirmationRow[]>(() => {
    if (!confirmations) return [];

    return confirmations
      .filter((c) => {
        // Filter by date range
        if (dateFrom || dateTo) {
          const arrivalDate = parseConfirmationDate(c.arrival_date);
          if (!arrivalDate) return false;
          if (dateFrom && dateTo) {
            return isWithinInterval(arrivalDate, { start: dateFrom, end: dateTo });
          }
          if (dateFrom) return arrivalDate >= dateFrom;
          if (dateTo) return arrivalDate <= dateTo;
        }
        return true;
      })
      .map((c) => {
        const confirmationTransactions = transactions?.filter((t) => t.confirmation_id === c.id) || [];
        const confirmationExpenses = expenses?.filter((e) => e.confirmation_id === c.id) || [];
        const revenueExpected = Number(c.price) || 0;
        const days = c.total_days || 1;

        // Calculate received (confirmed "in" transactions only) - convert to USD
        const received = confirmationTransactions
          .filter((t) => t.kind === "in" && t.status === "confirmed")
          .reduce((sum, t) => sum + toUSD(t.amount, t.currency), 0);

        // Calculate ALL confirmed expense transactions (kind=out, status=confirmed) - convert to USD
        const allExpenseTransactions = confirmationTransactions
          .filter((t) => t.kind === "out" && t.status === "confirmed")
          .reduce((sum, t) => sum + toUSD(t.amount, t.currency), 0);

        // Get invoice expenses from attachments with names
        const invoiceExpenses = confirmationExpenses.map((e) => {
          const cleanedName = e.description
            ? e.description
                .replace(/^invoice:\s*/i, "")
                .replace(/^payment:\s*/i, "")
                .replace(/\.pdf$/i, "")
            : "Hotel";
          return {
            name: cleanedName || "Hotel",
            amount: Number(e.amount),
          };
        });
        const invoiceExpensesTotal = invoiceExpenses.reduce((sum, e) => sum + e.amount, 0);

        const totalExpenses = allExpenseTransactions + invoiceExpensesTotal;

        // Get responsible holder from income transaction
        const incomeTransaction = confirmationTransactions.find((t) => t.kind === "in");
        const responsibleHolderId = incomeTransaction?.responsible_holder_id || null;

        return {
          id: c.id,
          code: c.confirmation_code,
          client: c.main_client_name,
          responsibleHolderId,
          arrivalDate: c.arrival_date,
          days,
          revenueExpected,
          received,
          pending: revenueExpected - received,
          expenses: totalExpenses,
          profit: revenueExpected - totalExpenses,
          clientPaid: c.client_paid || false,
          hotelsPaid: c.is_paid || false,
          invoiceExpenses,
          transactions: confirmationTransactions,
        };
      })
      .filter((c) => c.revenueExpected > 0); // Only show confirmations with a price
  }, [confirmations, transactions, expenses, dateFrom, dateTo]);

  useEffect(() => {
    if (!confirmations || !allTransactionsForAutogen || !expenseRules || !savedHotels || isLoading) return;
    const activeRules = expenseRules.filter((r) => r.active);
    const missing: Parameters<typeof bulkCreateTransactions.mutate>[0] = [];

    for (const c of confirmations) {
      const selectedRuleIds: string[] = c.raw_payload?.selectedRuleIds || [];
      if (!selectedRuleIds.length) continue;
      const numAdults = Number(c.raw_payload?.guestInfo?.numAdults) || 1;
      const numDays = c.raw_payload?.itinerary?.length || 1;
      const itinerary = c.raw_payload?.itinerary || [];

      for (const rule of activeRules) {
        if (!selectedRuleIds.includes(rule.id)) continue;
        const key = `${c.id}:${rule.id}`;
        if (createdRulesRef.current.has(key)) continue;
        const already = allTransactionsForAutogen.some(
          (t) => t.confirmation_id === c.id && t.notes?.includes(`[rule:${rule.id}]`)
        );
        if (already) continue;

        const isHotelRule = (rule.hotel_ids ?? []).length > 0;
        const nights = isHotelRule
          ? countHotelNights(itinerary, rule.hotel_ids ?? [], savedHotels)
          : null;
        if (isHotelRule && nights === 0) continue;
        const multiplierDay = nights !== null ? nights : numDays;

        const amount = rule.rate * (rule.per_person ? numAdults : 1) * (rule.per_day ? multiplierDay : 1);
        const dayLabel = isHotelRule ? "nights" : "days";
        const parts = [
          ...(rule.per_person ? [`${numAdults} adults`] : []),
          ...(rule.per_day ? [`${multiplierDay} ${dayLabel}`] : []),
        ];
        createdRulesRef.current.add(key);
        missing.push({
          date: c.arrival_date ? isoDateFromDdMmYyyy(c.arrival_date) : format(new Date(), "yyyy-MM-dd"),
          kind: "out",
          status: "pending",
          category: rule.name.toLowerCase().replace(/\s+/g, "_"),
          description: parts.length ? `${rule.name} - ${parts.join(" x ")}` : rule.name,
          amount,
          currency: rule.currency as "GEL" | "USD",
          is_auto_generated: true,
          confirmation_id: c.id,
          payment_method: null,
          notes: `[rule:${rule.id}] Auto-generated`,
        });
      }
    }
    if (missing.length) bulkCreateTransactions.mutate(missing);
  }, [confirmations, allTransactionsForAutogen, expenseRules, savedHotels, isLoading, bulkCreateTransactions]);

  const handleToggleClientPaid = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("confirmations")
        .update({
          client_paid: !currentStatus,
          client_paid_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      toast({
        title: !currentStatus ? "Marked as received" : "Marked as pending",
      });
    } catch (error) {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleToggleHotelsPaid = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("confirmations")
        .update({
          is_paid: !currentStatus,
          paid_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      toast({
        title: !currentStatus ? "Hotels marked as paid" : "Hotels marked as unpaid",
      });
    } catch (error) {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleAddTransaction = (confirmationId: string) => {
    setModalConfirmationId(confirmationId);
    setModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!confirmationRows.length) return;

    const headers = ["Code", "Client", "Arrival", "Days", "Revenue", "Received", "Pending", "Expenses", "Profit", "Client Paid", "Hotels Paid"];
    const rows = confirmationRows.map((c) => [
      c.code,
      c.client || "",
      c.arrivalDate || "",
      c.days,
      c.revenueExpected,
      c.received,
      c.pending,
      c.expenses,
      c.profit,
      c.clientPaid ? "Yes" : "No",
      c.hotelsPaid ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `confirmations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  // Filter by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return confirmationRows;
    const q = searchQuery.toLowerCase();
    return confirmationRows.filter(
      (row) =>
        row.code.toLowerCase().includes(q) ||
        (row.client && row.client.toLowerCase().includes(q))
    );
  }, [confirmationRows, searchQuery]);

  // Determine payment status for a row
  const getPaymentStatus = (row: ConfirmationRow): "paid" | "pending" | "overdue" => {
    if (row.clientPaid) return "paid";
    if (row.arrivalDate) {
      const parts = row.arrivalDate.split("/");
      if (parts.length === 3) {
        const arrDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (isPast(arrDate)) return "overdue";
      }
    }
    return "pending";
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <FinanceSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by code or client..."
          className="sm:w-72"
        />
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filteredRows.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px]" />
              <TableHead className="font-semibold">Code</TableHead>
              <TableHead className="font-semibold">Client</TableHead>
              <TableHead className="font-semibold">Responsible</TableHead>
              <TableHead className="font-semibold">Arrival</TableHead>
              <TableHead className="text-center font-semibold">Days</TableHead>
              <TableHead className="text-right font-semibold">Revenue</TableHead>
              <TableHead className="text-right font-semibold">Expenses</TableHead>
              <TableHead className="text-center font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filteredRows.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No matching confirmations" : "No confirmations with revenue found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <Collapsible key={row.id} open={expandedId === row.id} onOpenChange={(open) => setExpandedId(open ? row.id : null)} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/50 group">
                        <TableCell>
                          {expandedId === row.id ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium font-mono text-primary">
                          {row.code}
                        </TableCell>
                        <TableCell className="font-medium">{row.client || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.responsibleHolderId 
                            ? holders?.find(h => h.id === row.responsibleHolderId)?.name || "—"
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.arrivalDate || "—"}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.days}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                          {formatTransactionAmount(row.revenueExpected, "USD")}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatTransactionAmount(row.expenses, "USD")}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleClientPaid(row.id, row.clientPaid)}
                            className="transition-transform hover:scale-105"
                          >
                            <StatusBadge status={getPaymentStatus(row)} size="sm" />
                          </button>
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={10} className="p-0">
                          <div className="p-4 space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4 max-w-md">
                              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                                <p className="text-xs text-muted-foreground">Income</p>
                                <p className="text-lg font-bold text-emerald-600">
                                  {formatAmount(row.revenueExpected)}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                                <p className="text-xs text-muted-foreground">Expenses</p>
                                <p className="text-lg font-bold text-red-600">
                                  {formatAmount(row.expenses)}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-xs text-muted-foreground">Profit</p>
                                <p className={cn("text-lg font-bold", row.profit >= 0 ? "text-blue-600" : "text-red-600")}>
                                  {formatAmount(row.profit)}
                                </p>
                              </div>
                            </div>

                            {/* Expense Breakdown */}
                            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                              {/* Hotels */}
                              {row.invoiceExpenses.map((inv, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 shrink-0" />
                                  <span>Hotel: {inv.name} - {formatAmount(inv.amount)}</span>
                                </div>
                              ))}
                            </div>

                            {/* Transactions */}
                            {row.transactions.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Transactions</p>
                                <div className="space-y-1">
                                  {row.transactions.map((t) => (
                                    <div
                                      key={t.id}
                                      className="flex items-center gap-3 text-sm py-1.5 px-2 rounded bg-background"
                                    >
                                      <span className="w-16 text-muted-foreground">
                                        {format(new Date(t.date), "MMM d")}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "w-12 justify-center",
                                          t.kind === "in" ? "border-emerald-500" : t.kind === "out" ? "border-red-500" : "border-blue-500"
                                        )}
                                      >
                                        {t.kind === "in" ? "In" : t.kind === "out" ? "Out" : "Transfer"}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "w-16 justify-center",
                                          t.status === "confirmed" ? "border-emerald-500 bg-emerald-50" : "border-amber-500 bg-amber-50"
                                        )}
                                      >
                                        {t.status === "confirmed" ? "Confirmed" : "Pending"}
                                      </Badge>
                                      <span className="flex-1">{t.description || t.category}</span>
                                      <span
                                        className={cn(
                                          "font-medium",
                                          t.kind === "in" ? "text-emerald-600" : "text-red-600"
                                        )}
                                      >
                                        {formatTransactionAmount(t.amount, t.currency)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleAddTransaction(row.id)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Transaction
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      <TransactionModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setModalConfirmationId(undefined);
        }}
        defaultConfirmationId={modalConfirmationId}
      />
    </div>
  );
}
