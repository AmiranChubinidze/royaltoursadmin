import { useEffect, useMemo, useRef, useState } from "react";
import { format, isWithinInterval, isPast } from "date-fns";
import * as XLSX from "xlsx-js-style";
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
import { ConfirmWithResponsiblePopover } from "./ConfirmWithResponsiblePopover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  Sparkles,
  Receipt,
} from "lucide-react";
import {
  Transaction,
  TransactionType,
  TransactionCategory,
  useTransactions,
  useDeleteTransaction,
  useConfirmTransaction,
  useBulkCreateTransactions,
} from "@/hooks/useTransactions";
import { TransactionModal } from "./TransactionModal";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useExpenses } from "@/hooks/useExpenses";
import { useHolders } from "@/hooks/useHolders";
import { useToast } from "@/hooks/use-toast";
import { FinanceSearch } from "./FinanceSearch";
import { StatusCheckbox } from "./StatusCheckbox";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GEL: "₾",
};

// Format transaction amount in its original currency (no conversion)
const formatTransactionAmount = (amount: number, currency?: string): string => {
  const symbol = CURRENCY_SYMBOLS[currency || "USD"] || "$";
  return `${symbol}${Math.round(amount).toLocaleString()}`;
};

interface LedgerViewProps {
  dateFrom?: Date;
  dateTo?: Date;
}

const CATEGORY_LABELS: Record<string, string> = {
  tour_payment: "Tour",
  hotel: "Hotel",
  driver: "Driver",
  sim: "SIM Card",
  breakfast: "Breakfast",
  fuel: "Fuel",
  guide: "Guide",
  salary: "Salary",
  transfer_internal: "Transfer",
  reimbursement: "Reimbursement",
  deposit: "Bank Deposit",
  currency_exchange: "Exchange",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  tour_payment: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  hotel: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  driver: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  sim: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  breakfast: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  fuel: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  guide: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  salary: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const getCategoryLabel = (category: string) => {
  return CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
};

const getCategoryColor = (category: string) => {
  return CATEGORY_COLORS[category] || "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
};

const MEALS_RATE_PER_2_ADULTS = 15;
const MEALS_HOTELS = ["INN MARTVILI", "ORBI"];

const isoDateFromDdMmYyyy = (dateStr: string | null | undefined) => {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
};

const calculateMealsFromPayload = (rawPayload: unknown) => {
  const payload = rawPayload as any;
  const itinerary = (payload?.itinerary as any[]) || [];
  const numAdults = Number(payload?.guestInfo?.numAdults) || 2;

  const mealsNights = itinerary.filter((day) => {
    const hotelName = String(day?.hotel || "").toUpperCase().trim();
    return MEALS_HOTELS.some((h) => hotelName.includes(h));
  }).length;

  const mealsExpense = Math.ceil(numAdults / 2) * MEALS_RATE_PER_2_ADULTS * mealsNights;

  return { mealsNights, mealsExpense, numAdults };
};

export function LedgerView({ dateFrom, dateTo }: LedgerViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [kindFilter, setKindFilter] = useState<"all" | "in" | "out" | "transfer" | "exchange">("all");
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending">("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalConfirmationId, setModalConfirmationId] = useState<string | undefined>();
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<string | null>(null);

  const { data: confirmations, isLoading: confirmationsLoading } = useConfirmations(500);
  const { data: expenses } = useExpenses();
  const { data: holders } = useHolders();
  const { data: transactionsForAutogen } = useTransactions({ dateFrom, dateTo });

  const bulkCreateTransactions = useBulkCreateTransactions();
  const createdMealsRef = useRef<Set<string>>(new Set());

  const { data: transactions, isLoading: transactionsLoading } = useTransactions({
    dateFrom,
    dateTo,
    kind: kindFilter === "all" ? undefined : kindFilter,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const isLoading = confirmationsLoading || transactionsLoading;

  const deleteTransaction = useDeleteTransaction();
  const confirmTransaction = useConfirmTransaction();

  // Parse date from DD/MM/YYYY format
  const parseConfirmationDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  // Build confirmation rows for the income section
  interface ConfirmationRow {
    id: string;
    code: string;
    client: string | null;
    arrivalDate: string | null;
    days: number;
    revenueExpected: number;
    clientPaid: boolean;
    responsibleHolderId: string | null;
  }

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
        const revenueExpected = Number(c.price) || 0;
        const days = c.total_days || 1;

        // Find the income transaction for this confirmation to get responsible holder
        const incomeTransaction = transactionsForAutogen?.find(
          (t) => t.confirmation_id === c.id && t.kind === "in"
        );

        return {
          id: c.id,
          code: c.confirmation_code,
          client: c.main_client_name,
          arrivalDate: c.arrival_date,
          days,
          revenueExpected,
          clientPaid: c.client_paid || false,
          responsibleHolderId: incomeTransaction?.responsible_holder_id || null,
        };
      })
      .filter((c) => c.revenueExpected > 0);
  }, [confirmations, transactionsForAutogen, dateFrom, dateTo]);

  // Filter confirmations by search
  const filteredConfirmations = useMemo(() => {
    if (!searchQuery.trim()) return confirmationRows;
    const q = searchQuery.toLowerCase();
    return confirmationRows.filter(
      (row) =>
        row.code.toLowerCase().includes(q) ||
        (row.client && row.client.toLowerCase().includes(q))
    );
  }, [confirmationRows, searchQuery]);

  // Get payment status for a confirmation
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

  // Handle confirmation payment toggle with responsible holder
  const handleToggleClientPaid = async (id: string, currentStatus: boolean, responsibleHolderId: string | null) => {
    try {
      const confirmation = confirmations?.find(c => c.id === id);
      const { error } = await supabase
        .from("confirmations")
        .update({
          client_paid: !currentStatus,
          client_paid_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;

      // Find or create the linked income transaction
      const incomeTransaction = transactionsForAutogen?.find(
        (t) => t.confirmation_id === id && t.kind === "in"
      );

      if (!currentStatus) {
        // Marking as paid - update transaction with responsible holder
        if (incomeTransaction) {
          await supabase
            .from("transactions")
            .update({ 
              status: "confirmed",
              responsible_holder_id: responsibleHolderId,
            })
            .eq("id", incomeTransaction.id);
        } else if (confirmation) {
          // Create income transaction for ledger tracking with responsible holder
          await supabase
            .from("transactions")
            .insert({
              date: isoDateFromDdMmYyyy(confirmation.arrival_date),
              kind: "in",
              type: "income",
              category: "tour_payment",
              description: `Tour payment - ${confirmation.confirmation_code}`,
              amount: confirmation.price || 0,
              currency: "USD",
              status: "confirmed",
              confirmation_id: id,
              is_auto_generated: false,
              responsible_holder_id: responsibleHolderId,
            });
        }
      } else {
        // Unmarking - set transaction back to pending, keep responsible holder
        if (incomeTransaction) {
          await supabase
            .from("transactions")
            .update({ status: "pending" })
            .eq("id", incomeTransaction.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["holders"] });
      toast({
        title: !currentStatus ? "Marked as received" : "Marked as pending",
      });
    } catch (error) {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleAddTransactionForConfirmation = (confirmationId: string) => {
    setModalConfirmationId(confirmationId);
    setEditingTransaction(null);
    setModalOpen(true);
  };

  // Auto-create meals transactions so they show up in the Ledger
  useEffect(() => {
    if (!confirmations || !transactionsForAutogen) return;

    const parseConfirmationDate = (dateStr: string | null): Date | null => {
      if (!dateStr) return null;
      const parts = dateStr.split("/");
      if (parts.length !== 3) return null;
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    };

    const missingMealsTransactions = confirmations
      .filter((c: any) => {
        if (createdMealsRef.current.has(c.id)) return false;

        if (dateFrom || dateTo) {
          const arrivalDate = parseConfirmationDate(c.arrival_date);
          if (!arrivalDate) return false;
          if (dateFrom && arrivalDate < dateFrom) return false;
          if (dateTo && arrivalDate > dateTo) return false;
        }

        const { mealsExpense, mealsNights } = calculateMealsFromPayload(c.raw_payload);
        if (mealsNights <= 0 || mealsExpense <= 0) return false;

        const hasMeals = transactionsForAutogen.some(
          (t) => t.confirmation_id === c.id && t.category === "breakfast"
        );
        return !hasMeals;
      })
      .map((c: any) => {
        const { mealsExpense, mealsNights, numAdults } = calculateMealsFromPayload(c.raw_payload);
        return {
          date: isoDateFromDdMmYyyy(c.arrival_date),
          kind: "out" as const,
          status: "confirmed" as const,
          category: "breakfast" as const,
          description: `Meals - ${mealsNights} nights (${numAdults} adults)`,
          amount: mealsExpense,
          is_auto_generated: true,
          confirmation_id: c.id,
          payment_method: null,
          notes: "Auto-generated meals expense (GEL)",
        };
      });

    if (missingMealsTransactions.length > 0) {
      missingMealsTransactions.forEach((t) => {
        if (t.confirmation_id) createdMealsRef.current.add(t.confirmation_id);
      });
      bulkCreateTransactions.mutate(missingMealsTransactions);
    }
  }, [confirmations, transactionsForAutogen, bulkCreateTransactions, dateFrom, dateTo]);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTransaction.mutateAsync(deleteId);
      toast({ title: "Transaction deleted" });
      setDeleteId(null);
    } catch (error) {
      toast({ title: "Error deleting transaction", variant: "destructive" });
    }
  };

  const handleConfirmTransaction = async (id: string, isCurrentlyConfirmed: boolean, responsibleHolderId: string | null) => {
    try {
      await confirmTransaction.mutateAsync({ 
        id, 
        confirm: !isCurrentlyConfirmed,
        responsibleHolderId: !isCurrentlyConfirmed ? responsibleHolderId : undefined
      });
    } catch (error) {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleExportExcel = () => {
    if (!transactions?.length) return;

    // Styles
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      fill: { fgColor: { rgb: "1E3A5F" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } },
      },
    };

    const incomeRowStyle = { fill: { fgColor: { rgb: "E6F4EA" } } };
    const expenseRowStyle = { fill: { fgColor: { rgb: "FCE8E6" } } };
    const transferRowStyle = { fill: { fgColor: { rgb: "E8F0FE" } } };
    const exchangeRowStyle = { fill: { fgColor: { rgb: "F3E8FD" } } };
    const pendingStyle = { fill: { fgColor: { rgb: "FFF9E6" } } };

    const cellBorder = {
      border: {
        top: { style: "thin", color: { rgb: "E0E0E0" } },
        bottom: { style: "thin", color: { rgb: "E0E0E0" } },
        left: { style: "thin", color: { rgb: "E0E0E0" } },
        right: { style: "thin", color: { rgb: "E0E0E0" } },
      },
    };

    const titleStyle = {
      font: { bold: true, sz: 16, color: { rgb: "1E3A5F" } },
      alignment: { horizontal: "left" },
    };

    const subtitleStyle = {
      font: { sz: 11, color: { rgb: "666666" } },
      alignment: { horizontal: "left" },
    };

    const summaryHeaderStyle = {
      font: { bold: true, sz: 12, color: { rgb: "1E3A5F" } },
      fill: { fgColor: { rgb: "F8F9FA" } },
    };

    const amountStyle = {
      numFmt: "#,##0.00",
      alignment: { horizontal: "right" },
    };

    // Calculate totals
    const totals = { incomeUSD: 0, incomeGEL: 0, expenseUSD: 0, expenseGEL: 0 };
    const categoryTotals: Record<string, { usd: number; gel: number }> = {};

    transactions.forEach((t) => {
      const currency = t.currency || "USD";
      if (t.kind === "in") {
        if (currency === "USD") totals.incomeUSD += t.amount;
        else totals.incomeGEL += t.amount;
      } else if (t.kind === "out") {
        if (currency === "USD") totals.expenseUSD += t.amount;
        else totals.expenseGEL += t.amount;
        
        // Track by category
        if (!categoryTotals[t.category]) categoryTotals[t.category] = { usd: 0, gel: 0 };
        if (currency === "USD") categoryTotals[t.category].usd += t.amount;
        else categoryTotals[t.category].gel += t.amount;
      }
    });

    const dateRangeText = dateFrom && dateTo
      ? `${format(dateFrom, "MMM d, yyyy")} to ${format(dateTo, "MMM d, yyyy")}`
      : "All Time";

    // ===== SHEET 1: Summary Dashboard - Clean & Minimal =====
    const summaryData: any[][] = [];

    // Title area - simple and elegant
    summaryData.push([{ v: "Financial Summary", s: { font: { bold: true, sz: 24, color: { rgb: "333333" } } } }]);
    summaryData.push([{ v: dateRangeText, s: { font: { sz: 12, color: { rgb: "888888" } } } }]);
    summaryData.push([]);
    summaryData.push([]);

    // Main metrics - big numbers
    const bigNumberStyle = {
      font: { bold: true, sz: 20, color: { rgb: "2F5597" } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt: "#,##0",
    };

    const labelSmall = {
      font: { sz: 10, color: { rgb: "999999" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const metricBox = {
      fill: { fgColor: { rgb: "F8F9FA" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    summaryData.push([
      { v: "INCOME", s: { ...labelSmall, fill: { fgColor: { rgb: "E6F4EA" } } } },
      "",
      { v: "EXPENSES", s: { ...labelSmall, fill: { fgColor: { rgb: "FCE8E6" } } } },
      "",
      { v: "NET", s: { ...labelSmall, fill: { fgColor: { rgb: "E8F0FE" } } } },
    ]);
    summaryData.push([
      { v: totals.incomeUSD, s: { ...bigNumberStyle, fill: { fgColor: { rgb: "E6F4EA" } }, color: { rgb: "1B7F37" } } },
      "",
      { v: totals.expenseUSD, s: { ...bigNumberStyle, fill: { fgColor: { rgb: "FCE8E6" } }, color: { rgb: "C53929" } } },
      "",
      { v: totals.incomeUSD - totals.expenseUSD, s: { ...bigNumberStyle, fill: { fgColor: { rgb: "E8F0FE" } } } },
    ]);
    summaryData.push([
      { v: "USD", s: { font: { sz: 9, color: { rgb: "666666" } }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "E6F4EA" } } } },
      "",
      { v: "USD", s: { font: { sz: 9, color: { rgb: "666666" } }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "FCE8E6" } } } },
      "",
      { v: "USD", s: { font: { sz: 9, color: { rgb: "666666" } }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "E8F0FE" } } } },
    ]);
    summaryData.push([]);

    // GEL row
    summaryData.push([
      { v: totals.incomeGEL, s: { font: { bold: true, sz: 14, color: { rgb: "1B7F37" } }, alignment: { horizontal: "center" }, numFmt: "#,##0" } },
      "",
      { v: totals.expenseGEL, s: { font: { bold: true, sz: 14, color: { rgb: "C53929" } }, alignment: { horizontal: "center" }, numFmt: "#,##0" } },
      "",
      { v: totals.incomeGEL - totals.expenseGEL, s: { font: { bold: true, sz: 14, color: { rgb: "2F5597" } }, alignment: { horizontal: "center" }, numFmt: "#,##0" } },
    ]);
    summaryData.push([
      { v: "GEL", s: { font: { sz: 9, color: { rgb: "999999" } }, alignment: { horizontal: "center" } } },
      "",
      { v: "GEL", s: { font: { sz: 9, color: { rgb: "999999" } }, alignment: { horizontal: "center" } } },
      "",
      { v: "GEL", s: { font: { sz: 9, color: { rgb: "999999" } }, alignment: { horizontal: "center" } } },
    ]);

    summaryData.push([]);
    summaryData.push([]);

    // Expense breakdown - minimal table
    summaryData.push([{ v: "Expenses by Category", s: { font: { bold: true, sz: 14, color: { rgb: "333333" } } } }]);
    summaryData.push([]);

    const catHeaderStyle = {
      font: { bold: true, sz: 10, color: { rgb: "666666" } },
      alignment: { horizontal: "left" },
      border: { bottom: { style: "thin", color: { rgb: "DDDDDD" } } },
    };

    summaryData.push([
      { v: "Category", s: catHeaderStyle },
      { v: "USD", s: { ...catHeaderStyle, alignment: { horizontal: "right" } } },
      { v: "GEL", s: { ...catHeaderStyle, alignment: { horizontal: "right" } } },
    ]);

    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => (b[1].usd + b[1].gel) - (a[1].usd + a[1].gel));

    sortedCategories.forEach(([cat, amounts], idx) => {
      const isLast = idx === sortedCategories.length - 1;
      const rowBorder = isLast ? {} : { border: { bottom: { style: "thin", color: { rgb: "F0F0F0" } } } };
      summaryData.push([
        { v: getCategoryLabel(cat), s: { font: { sz: 11 }, ...rowBorder } },
        { v: amounts.usd, s: { font: { sz: 11 }, alignment: { horizontal: "right" }, numFmt: "#,##0", ...rowBorder } },
        { v: amounts.gel, s: { font: { sz: 11 }, alignment: { horizontal: "right" }, numFmt: "#,##0", ...rowBorder } },
      ]);
    });

    summaryData.push([]);
    summaryData.push([]);

    // Footer
    summaryData.push([
      { v: `${transactions.length} transactions`, s: { font: { sz: 10, color: { rgb: "AAAAAA" } } } },
      "",
      { v: `Generated ${format(new Date(), "MMM d, yyyy")}`, s: { font: { sz: 10, color: { rgb: "AAAAAA" } }, alignment: { horizontal: "right" } } },
    ]);

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 18 }, { wch: 4 }, { wch: 18 }, { wch: 4 }, { wch: 18 }];

    // ===== SHEET 2: All Transactions =====
    const headers = [
      "Date", "Confirmation", "Kind", "Category", "Description",
      "Amount", "Currency", "Status", "Method", "Responsible", "From", "To", "Notes"
    ];

    const cellStyle = {
      alignment: { horizontal: "left", vertical: "center" },
    };

    const centerStyle = {
      alignment: { horizontal: "center", vertical: "center" },
    };

    const transactionRows: any[][] = [headers.map(h => ({ v: h, s: headerStyle }))];

    transactions.forEach((t) => {
      const rowStyle = t.status === "pending" ? pendingStyle :
        t.kind === "in" ? incomeRowStyle :
        t.kind === "out" ? expenseRowStyle :
        t.kind === "transfer" ? transferRowStyle :
        t.category === "currency_exchange" ? exchangeRowStyle : {};

      const row = [
        { v: format(new Date(t.date), "MMM d, yyyy"), s: { ...cellBorder, ...rowStyle, ...cellStyle } },
        { v: t.confirmation?.confirmation_code || "General", s: { ...cellBorder, ...rowStyle, ...cellStyle } },
        { v: t.kind.toUpperCase(), s: { ...cellBorder, ...rowStyle, ...centerStyle, font: { bold: true } } },
        { v: getCategoryLabel(t.category), s: { ...cellBorder, ...rowStyle, ...cellStyle } },
        { v: t.description || "—", s: { ...cellBorder, ...rowStyle, ...cellStyle } },
        { v: t.amount, s: { ...cellBorder, ...rowStyle, ...amountStyle } },
        { v: t.currency || "USD", s: { ...cellBorder, ...rowStyle, ...centerStyle } },
        { v: t.status === "confirmed" ? "✓ Confirmed" : "○ Pending", s: { ...cellBorder, ...rowStyle, ...centerStyle } },
        { v: t.payment_method || "—", s: { ...cellBorder, ...rowStyle, ...centerStyle } },
        { v: t.responsible_holder?.name || "—", s: { ...cellBorder, ...rowStyle, ...cellStyle } },
        { v: t.from_holder?.name || "—", s: { ...cellBorder, ...rowStyle, ...cellStyle } },
        { v: t.to_holder?.name || "—", s: { ...cellBorder, ...rowStyle, ...cellStyle } },
        { v: t.notes || "", s: { ...cellBorder, ...rowStyle, ...cellStyle } },
      ];
      transactionRows.push(row);
    });

    const allTransactionsSheet = XLSX.utils.aoa_to_sheet(transactionRows);
    allTransactionsSheet["!cols"] = [
      { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 28 },
      { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 22 }
    ];
    allTransactionsSheet["!freeze"] = { xSplit: 0, ySplit: 1 };

    // ===== SHEET 3: Income Only =====
    const incomeTransactions = transactions.filter(t => t.kind === "in");
    const incomeRows: any[][] = [["Date", "Confirmation", "Category", "Description", "Amount", "Currency", "Status"].map(h => ({ v: h, s: headerStyle }))];
    
    incomeTransactions.forEach((t) => {
      incomeRows.push([
        { v: format(new Date(t.date), "MMM d, yyyy"), s: { ...cellBorder, ...incomeRowStyle, ...cellStyle } },
        { v: t.confirmation?.confirmation_code || "General", s: { ...cellBorder, ...incomeRowStyle, ...cellStyle } },
        { v: getCategoryLabel(t.category), s: { ...cellBorder, ...incomeRowStyle, ...cellStyle } },
        { v: t.description || "—", s: { ...cellBorder, ...incomeRowStyle, ...cellStyle } },
        { v: t.amount, s: { ...cellBorder, ...incomeRowStyle, ...amountStyle } },
        { v: t.currency || "USD", s: { ...cellBorder, ...incomeRowStyle, ...centerStyle } },
        { v: t.status === "confirmed" ? "✓ Received" : "○ Pending", s: { ...cellBorder, ...incomeRowStyle, ...centerStyle } },
      ]);
    });

    incomeRows.push([]);
    incomeRows.push([{ v: "TOTAL", s: { font: { bold: true, sz: 11 } } }, "", "", "", 
      { v: incomeTransactions.reduce((sum, t) => sum + (t.currency === "USD" ? t.amount : 0), 0), s: { ...amountStyle, font: { bold: true } } },
      { v: "USD", s: { ...centerStyle, font: { bold: true } } }
    ]);
    incomeRows.push(["", "", "", "", 
      { v: incomeTransactions.reduce((sum, t) => sum + (t.currency === "GEL" ? t.amount : 0), 0), s: { ...amountStyle, font: { bold: true } } },
      { v: "GEL", s: { ...centerStyle, font: { bold: true } } }
    ]);

    const incomeSheet = XLSX.utils.aoa_to_sheet(incomeRows);
    incomeSheet["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 8 }, { wch: 12 }];

    // ===== SHEET 4: Expenses Only =====
    const expenseTransactions = transactions.filter(t => t.kind === "out");
    const expenseRows: any[][] = [["Date", "Confirmation", "Category", "Description", "Amount", "Currency", "Status", "Responsible"].map(h => ({ v: h, s: headerStyle }))];
    
    expenseTransactions.forEach((t) => {
      expenseRows.push([
        { v: format(new Date(t.date), "MMM d, yyyy"), s: { ...cellBorder, ...expenseRowStyle, ...cellStyle } },
        { v: t.confirmation?.confirmation_code || "General", s: { ...cellBorder, ...expenseRowStyle, ...cellStyle } },
        { v: getCategoryLabel(t.category), s: { ...cellBorder, ...expenseRowStyle, ...cellStyle } },
        { v: t.description || "—", s: { ...cellBorder, ...expenseRowStyle, ...cellStyle } },
        { v: t.amount, s: { ...cellBorder, ...expenseRowStyle, ...amountStyle } },
        { v: t.currency || "USD", s: { ...cellBorder, ...expenseRowStyle, ...centerStyle } },
        { v: t.status === "confirmed" ? "✓ Paid" : "○ Pending", s: { ...cellBorder, ...expenseRowStyle, ...centerStyle } },
        { v: t.responsible_holder?.name || "—", s: { ...cellBorder, ...expenseRowStyle, ...cellStyle } },
      ]);
    });

    expenseRows.push([]);
    expenseRows.push([{ v: "TOTAL", s: { font: { bold: true, sz: 11 } } }, "", "", "", 
      { v: expenseTransactions.reduce((sum, t) => sum + (t.currency === "USD" ? t.amount : 0), 0), s: { ...amountStyle, font: { bold: true } } },
      { v: "USD", s: { ...centerStyle, font: { bold: true } } }
    ]);
    expenseRows.push(["", "", "", "", 
      { v: expenseTransactions.reduce((sum, t) => sum + (t.currency === "GEL" ? t.amount : 0), 0), s: { ...amountStyle, font: { bold: true } } },
      { v: "GEL", s: { ...centerStyle, font: { bold: true } } }
    ]);

    const expenseSheet = XLSX.utils.aoa_to_sheet(expenseRows);
    expenseSheet["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];

    // Create workbook and add sheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, allTransactionsSheet, "All Transactions");
    XLSX.utils.book_append_sheet(workbook, incomeSheet, "Income");
    XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses");

    // Generate filename
    const fromStr = dateFrom ? format(dateFrom, "yyyy-MM-dd") : "all";
    const toStr = dateTo ? format(dateTo, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    const filename = `Royal-Georgian-Ledger_${fromStr}_to_${toStr}.xlsx`;

    // Download
    XLSX.writeFile(workbook, filename);
  };

  // Filter all transactions by search and responsible holder
  const filteredTransactions = (transactions || []).filter(t => {
    // Holder filter - check all holder fields (from, to, responsible)
    if (responsibleFilter !== "all") {
      const matchesHolder = 
        t.from_holder_id === responsibleFilter ||
        t.to_holder_id === responsibleFilter ||
        t.responsible_holder_id === responsibleFilter;
      if (!matchesHolder) return false;
    }
    
    // Search filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.description?.toLowerCase().includes(q) ||
      t.confirmation?.confirmation_code?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.counterparty?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
        <FinanceSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search..."
          className="w-full sm:w-64"
        />
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="in">Income</SelectItem>
              <SelectItem value="out">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="exchange">Exchange</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Responsible" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Holders</SelectItem>
              {holders?.map((holder) => (
                <SelectItem key={holder.id} value={holder.id}>
                  {holder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!transactions?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>

          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Confirmations (Income) Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Receipt className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-medium text-foreground">Confirmations</h3>
          <span className="text-xs text-muted-foreground">
            ({filteredConfirmations.length})
          </span>
        </div>
        <div className="rounded-lg border bg-card">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] font-semibold">Code</TableHead>
                <TableHead className="w-auto font-semibold">Client</TableHead>
                <TableHead className="w-[100px] font-semibold">Responsible</TableHead>
                <TableHead className="w-[90px] font-semibold">Arrival</TableHead>
                <TableHead className="w-[60px] text-center font-semibold">Days</TableHead>
                <TableHead className="w-[100px] text-right font-semibold">Amount</TableHead>
                <TableHead className="w-[90px] text-center font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !filteredConfirmations.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    {searchQuery ? "No matching confirmations" : "No confirmations with revenue"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredConfirmations.map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell className="font-medium font-mono text-primary">
                      {row.code}
                    </TableCell>
                    <TableCell className="font-medium truncate">
                      {row.client || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.responsibleHolderId
                        ? holders?.find(h => h.id === row.responsibleHolderId)?.name || "—"
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.arrivalDate || "—"}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {row.days}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      ${Math.round(row.revenueExpected).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <ConfirmWithResponsiblePopover
                          checked={row.clientPaid}
                          currentResponsibleId={row.responsibleHolderId}
                          onConfirm={(holderId) => handleToggleClientPaid(row.id, row.clientPaid, holderId)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h3 className="text-sm font-medium text-foreground">Transactions</h3>
          <span className="text-xs text-muted-foreground">
            ({filteredTransactions.length})
          </span>
        </div>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20 font-semibold">Date</TableHead>
                <TableHead className="w-28 font-semibold">Confirmation</TableHead>
                <TableHead className="w-16 font-semibold">Type</TableHead>
                <TableHead className="w-24 font-semibold">Category</TableHead>
                <TableHead className="w-24 font-semibold">Responsible</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="w-24 text-right font-semibold">Amount</TableHead>
                <TableHead className="w-16 text-center font-semibold">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !filteredTransactions.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    {searchQuery ? "No matching transactions" : "No transactions"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(t.date), "MMM d")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {t.confirmation?.confirmation_code || (
                        <span className="text-muted-foreground">General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          t.kind === "in"
                            ? "border-emerald-500 text-emerald-600"
                            : t.kind === "transfer"
                            ? "border-blue-500 text-blue-600"
                            : t.kind === "exchange"
                            ? "border-purple-500 text-purple-600"
                            : "border-red-500 text-red-600"
                        )}
                      >
                        {t.kind === "in" ? "In" : t.kind === "transfer" ? "Transfer" : t.kind === "exchange" ? "Exchange" : "Out"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-normal", getCategoryColor(t.category))}>
                        {getCategoryLabel(t.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {t.from_holder?.name || t.responsible_holder?.name || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {t.description ? (
                        <span
                          onClick={() => setExpandedDescriptionId(
                            expandedDescriptionId === t.id ? null : t.id
                          )}
                          className={cn(
                            "cursor-pointer hover:text-primary transition-colors",
                            expandedDescriptionId === t.id ? "whitespace-normal" : "truncate block"
                          )}
                        >
                          {t.description}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium whitespace-nowrap",
                        t.kind === "in" ? "text-emerald-600" : t.kind === "transfer" ? "text-blue-600" : t.kind === "exchange" ? "text-purple-600" : "text-red-600"
                      )}
                    >
                      {(() => {
                        if (t.kind === "exchange") {
                          // Extract rate and compute GEL amount
                          const rateMatch = t.notes?.match(/Exchange rate: ([\d.]+)/);
                          const rate = rateMatch ? parseFloat(rateMatch[1]) : null;
                          const gelAmount = rate ? t.amount * rate : null;
                          return (
                            <span title={`$${Math.round(t.amount).toLocaleString()} @ ${rate || "?"}`}>
                              ₾{gelAmount ? Math.round(gelAmount).toLocaleString() : Math.round(t.amount).toLocaleString()}
                            </span>
                          );
                        }
                        return `${t.kind === "in" ? "+" : t.kind === "transfer" ? "" : "-"}${formatTransactionAmount(t.amount, t.currency)}`;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      <ConfirmWithResponsiblePopover
                        checked={t.status === "confirmed"}
                        currentResponsibleId={t.responsible_holder_id}
                        onConfirm={(holderId) => handleConfirmTransaction(t.id, t.status === "confirmed", holderId)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(t)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(t.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modals */}
      <TransactionModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setModalConfirmationId(undefined);
            setEditingTransaction(null);
          }
        }}
        transaction={editingTransaction}
        defaultConfirmationId={modalConfirmationId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
