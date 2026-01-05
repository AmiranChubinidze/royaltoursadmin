import { useState, useMemo } from "react";
import { format, isWithinInterval } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useTransactions, Transaction } from "@/hooks/useTransactions";
import { TransactionModal } from "./TransactionModal";
import { useToast } from "@/hooks/use-toast";

interface ConfirmationsViewProps {
  dateFrom?: Date;
  dateTo?: Date;
}

const DRIVER_RATE_PER_DAY = 50;

interface ConfirmationRow {
  id: string;
  code: string;
  client: string | null;
  arrivalDate: string | null;
  days: number;
  revenueExpected: number;
  received: number;
  pending: number;
  expenses: number;
  profit: number;
  clientPaid: boolean;
  hotelsPaid: boolean;
  driverExpense: number;
  transactions: Transaction[];
}

export function ConfirmationsView({ dateFrom, dateTo }: ConfirmationsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: confirmations, isLoading: confirmationsLoading } = useConfirmations();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({ dateFrom, dateTo });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfirmationId, setModalConfirmationId] = useState<string | undefined>();

  const isLoading = confirmationsLoading || transactionsLoading;

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
        const revenueExpected = Number(c.price) || 0;
        const days = c.total_days || 1;
        const driverExpense = days * DRIVER_RATE_PER_DAY;

        // Calculate received (income transactions marked as paid)
        const received = confirmationTransactions
          .filter((t) => t.type === "income" && t.is_paid)
          .reduce((sum, t) => sum + t.amount, 0);

        // Calculate expenses (expense transactions marked as paid)
        const paidExpenses = confirmationTransactions
          .filter((t) => t.type === "expense" && t.is_paid)
          .reduce((sum, t) => sum + t.amount, 0);

        // Add auto-calculated driver expense if not already in transactions
        const hasDriverTransaction = confirmationTransactions.some((t) => t.category === "driver");
        const totalExpenses = paidExpenses + (hasDriverTransaction ? 0 : driverExpense);

        return {
          id: c.id,
          code: c.confirmation_code,
          client: c.main_client_name,
          arrivalDate: c.arrival_date,
          days,
          revenueExpected,
          received,
          pending: revenueExpected - received,
          expenses: totalExpenses,
          profit: revenueExpected - totalExpenses,
          clientPaid: c.client_paid || false,
          hotelsPaid: c.is_paid || false,
          driverExpense,
          transactions: confirmationTransactions,
        };
      })
      .filter((c) => c.revenueExpected > 0); // Only show confirmations with a price
  }, [confirmations, transactions, dateFrom, dateTo]);

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

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!confirmationRows.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Code</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Arrival</TableHead>
              <TableHead className="text-center">Days</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-center">Received?</TableHead>
              <TableHead className="text-center">Hotels Paid?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(10)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !confirmationRows.length ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No confirmations with revenue found
                </TableCell>
              </TableRow>
            ) : (
              confirmationRows.map((row) => (
                <Collapsible key={row.id} open={expandedId === row.id} onOpenChange={(open) => setExpandedId(open ? row.id : null)} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          {expandedId === row.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium font-mono">
                          {row.code}
                        </TableCell>
                        <TableCell>{row.client || "—"}</TableCell>
                        <TableCell>{row.arrivalDate || "—"}</TableCell>
                        <TableCell className="text-center">{row.days}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${row.revenueExpected.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          ${row.expenses.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={row.clientPaid}
                            onCheckedChange={() => handleToggleClientPaid(row.id, row.clientPaid)}
                          />
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={row.hotelsPaid}
                            onCheckedChange={() => handleToggleHotelsPaid(row.id, row.hotelsPaid)}
                          />
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
                                  ${row.revenueExpected.toLocaleString()}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                                <p className="text-xs text-muted-foreground">Expenses</p>
                                <p className="text-lg font-bold text-red-600">
                                  ${row.expenses.toLocaleString()}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-xs text-muted-foreground">Profit</p>
                                <p className={cn("text-lg font-bold", row.profit >= 0 ? "text-blue-600" : "text-red-600")}>
                                  ${row.profit.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Auto Driver Expense */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Sparkles className="h-4 w-4" />
                              <span>Auto Driver: ${row.driverExpense} ({row.days} days × $50)</span>
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
                                          t.type === "income" ? "border-emerald-500" : "border-red-500"
                                        )}
                                      >
                                        {t.type === "income" ? "In" : "Out"}
                                      </Badge>
                                      <span className="flex-1">{t.description || t.category}</span>
                                      <span
                                        className={cn(
                                          "font-medium",
                                          t.type === "income" ? "text-emerald-600" : "text-red-600"
                                        )}
                                      >
                                        ${t.amount.toLocaleString()}
                                      </span>
                                      {t.is_paid ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                      )}
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
