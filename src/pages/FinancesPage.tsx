import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CalendarIcon, Filter, X, Plus, Loader2 } from "lucide-react";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useTransactions, useUpdateTransaction } from "@/hooks/useTransactions";
import { FinanceSummaryCards } from "@/components/finances/FinanceSummaryCards";
import { LedgerView } from "@/components/finances/LedgerView";
import { CategoriesView } from "@/components/finances/CategoriesView";
import { HoldersView } from "@/components/finances/HoldersView";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileSummaryCards } from "@/components/finances/MobileSummaryCards";
import { MobileTransactionCard } from "@/components/finances/MobileTransactionCard";
import { TransactionModal } from "@/components/finances/TransactionModal";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useAuth } from "@/hooks/useAuth";

export default function FinancesPage() {
  const isMobile = useIsMobile();
  const { exchangeRate } = useCurrency();
  const { role, isAdmin, isWorker, isAccountant } = useUserRole();
  const { user } = useAuth();
  const { viewAsRole } = useViewAs();
  const effectiveRole = viewAsRole || role;
  const canSeeHoldings = effectiveRole
    ? !["coworker", "visitor"].includes(effectiveRole)
    : isAdmin || isWorker || isAccountant;
  const canEditTransaction = (t: any) => {
    if (["admin", "worker", "accountant"].includes(effectiveRole || "")) return true;
    if (effectiveRole !== "coworker") return false;
    if (!user?.id) return false;
    if (t.created_by === user.id) return true;
    if (t.kind === "exchange") return false;
    return !t.responsible_holder_id;
  };

  // Date filter state
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState("holders");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileView, setMobileView] = useState<"summary" | "transactions">("summary");
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const { data: confirmations, isLoading: confirmationsLoading } = useConfirmations();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({
    dateFrom,
    dateTo,
  });
  const updateTransaction = useUpdateTransaction();

  const isLoading = confirmationsLoading || transactionsLoading;

  useEffect(() => {
    if (!canSeeHoldings && activeTab === "holders") {
      setActiveTab("ledger");
    }
  }, [canSeeHoldings, activeTab]);

  // Parse dates that might come as DD/MM/YYYY or ISO (YYYY-MM-DD)
  const parseDateFlexible = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;

    // DD/MM/YYYY
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length !== 3) return null;
      const d = new Date(
        parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10)
      );
      return Number.isNaN(d.getTime()) ? null : d;
    }

    // ISO / other formats that Date can parse
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const getConfirmationFilterDate = (c: any): Date | null => {
    // Prefer arrival_date; fallback to confirmation_date; fallback to created_at
    return (
      parseDateFlexible(c.arrival_date) ||
      parseDateFlexible(c.confirmation_date) ||
      parseDateFlexible(c.created_at)
    );
  };

  // Helper to convert amount to USD for summary (all summaries in USD)
  const toUSD = (amount: number, currency: string): number => {
    if (currency === "GEL") {
      return amount * exchangeRate.gel_to_usd;
    }
    return amount; // Already USD
  };

  // Compute summary values with separate USD and GEL totals
  const summaryData = useMemo(() => {
    const empty = { USD: 0, GEL: 0 };
    if (!confirmations || !transactions) {
      return { 
        received: { ...empty }, 
        expenses: { ...empty }, 
        profit: { ...empty }, 
        pending: { ...empty } 
      };
    }

    // Filter confirmations by date range
    const filteredConfirmations = confirmations.filter((c) => {
      if (!c.price || Number(c.price) <= 0) return false;

      if (dateFrom || dateTo) {
        const d = getConfirmationFilterDate(c);
        if (!d) return false;
        if (dateFrom && dateTo) return isWithinInterval(d, { start: dateFrom, end: dateTo });
        if (dateFrom) return d >= dateFrom;
        if (dateTo) return d <= dateTo;
      }

      return true;
    });

    const responsibleTx = transactions.filter((t) => t.responsible_holder_id);

    // Received: sum of confirmed income transactions by currency (with responsible)
    const receivedUSD = responsibleTx
      .filter((t) => t.type === "income" && t.status === "confirmed" && t.currency === "USD")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    const receivedGEL = responsibleTx
      .filter((t) => t.type === "income" && t.status === "confirmed" && t.currency === "GEL")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // For confirmations without confirmed income transactions, use client_paid flag (prices are in USD)
    const confirmationsWithoutPaidIncomeTransactions = filteredConfirmations.filter((c) => {
      const hasConfirmedIncomeTransaction = responsibleTx.some(
        (t) => t.confirmation_id === c.id && t.type === "income" && t.status === "confirmed"
      );
      return !hasConfirmedIncomeTransaction && c.client_paid;
    });
    const receivedFromFlags = confirmationsWithoutPaidIncomeTransactions.reduce(
      (sum, c) => sum + (Number(c.price) || 0),
      0
    );

    const received = {
      USD: receivedUSD + receivedFromFlags,
      GEL: receivedGEL,
    };

    // Expenses: sum of confirmed expense transactions by currency
    // Exclude internal transfers and currency exchanges
    const expensesUSD = responsibleTx
      .filter((t) => t.type === "expense" && t.status === "confirmed" && t.currency === "USD" && t.category !== "transfer_internal" && t.category !== "currency_exchange")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    const expensesGEL = responsibleTx
      .filter((t) => t.type === "expense" && t.status === "confirmed" && t.currency === "GEL" && t.category !== "transfer_internal" && t.category !== "currency_exchange")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const expenses = { USD: expensesUSD, GEL: expensesGEL };

    // Profit = Received - Expenses (per currency)
    const profit = {
      USD: received.USD - expenses.USD,
      GEL: received.GEL - expenses.GEL,
    };

    // Pending: Revenue Expected (USD) - Received USD (confirmations prices are in USD)
    const revenueExpected = filteredConfirmations.reduce(
      (sum, c) => sum + (Number(c.price) || 0),
      0
    );
    const pending = {
      USD: Math.max(0, revenueExpected - received.USD),
      GEL: 0, // No GEL pending from confirmations
    };

    return { received, expenses, profit, pending };
  }, [confirmations, transactions, dateFrom, dateTo]);

  const exchangeSummary = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { rate: exchangeRate.gel_to_usd, usdOut: 0, usdIn: 0, gelOut: 0, gelIn: 0 };
    }
    const exchangeTx = transactions.filter(
      (t) =>
        t.kind === "exchange" &&
        t.status === "confirmed" &&
        (t.responsible_holder_id || t.from_holder_id)
    );
    let usdTotal = 0;
    let gelTotal = 0;
    let usdOut = 0;
    let usdIn = 0;
    let gelOut = 0;
    let gelIn = 0;
    for (const tx of exchangeTx) {
      const rateMatch = tx.notes?.match(/Exchange rate: ([\d.]+)/);
      const rateFromNotes = rateMatch ? parseFloat(rateMatch[1]) : null;
      const rateGelPerUsd = rateFromNotes && !Number.isNaN(rateFromNotes)
        ? rateFromNotes
        : exchangeRate.usd_to_gel;
      if (!rateGelPerUsd || Number.isNaN(rateGelPerUsd)) continue;
      const amount = Number(tx.amount) || 0;
      if (tx.currency === "USD") {
        usdTotal += amount;
        gelTotal += amount * rateGelPerUsd;
        usdOut += amount;
        gelIn += amount * rateGelPerUsd;
      } else if (tx.currency === "GEL") {
        usdTotal += amount / rateGelPerUsd;
        gelTotal += amount;
        gelOut += amount;
        usdIn += amount / rateGelPerUsd;
      }
    }
    if (usdTotal > 0 && gelTotal > 0) {
      // Convert GEL to USD using realized exchange: USD / GEL
      return { rate: usdTotal / gelTotal, usdOut, usdIn, gelOut, gelIn };
    }
    return { rate: exchangeRate.gel_to_usd, usdOut, usdIn, gelOut, gelIn };
  }, [transactions, exchangeRate.gel_to_usd]);

  const adjustedProfit = useMemo(() => {
    const profitUSD = summaryData.profit.USD - exchangeSummary.usdOut + exchangeSummary.usdIn;
    const profitGEL = summaryData.profit.GEL + exchangeSummary.gelIn - exchangeSummary.gelOut;
    return { USD: profitUSD, GEL: profitGEL };
  }, [summaryData.profit.USD, summaryData.profit.GEL, exchangeSummary]);

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    await updateTransaction.mutateAsync({ id, status: currentStatus ? "pending" : "confirmed" });
  };

  const handleEditTransaction = (id: string) => {
    const transaction = transactions?.find((t) => t.id === id);
    if (transaction && canEditTransaction(transaction)) {
      setEditingTransaction(transaction);
      setTransactionModalOpen(true);
    }
  };

  const isThisMonth =
    dateFrom?.getTime() === startOfMonth(new Date()).getTime() &&
    dateTo?.getTime() === endOfMonth(new Date()).getTime();
  const isAllTime = !dateFrom && !dateTo;

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col">
        <div className="flex-1 overflow-y-auto">

          <div className="px-4 py-4 space-y-4 pb-24">
            {/* Date filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button
                variant={isThisMonth ? "secondary" : "outline"}
                size="sm"
                className="flex-shrink-0"
                onClick={() => {
                  setDateFrom(startOfMonth(new Date()));
                  setDateTo(endOfMonth(new Date()));
                }}
              >
                This Month
              </Button>
              <Button
                variant={isAllTime ? "secondary" : "outline"}
                size="sm"
                className="flex-shrink-0"
                onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
              >
                All Time
              </Button>
              <Button
                variant={showMobileFilters ? "secondary" : "outline"}
                size="sm"
                className="flex-shrink-0"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <Filter className="h-3.5 w-3.5 mr-1" />
                Custom
              </Button>
            </div>

            {/* Custom date picker */}
            {showMobileFilters && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "MMM d") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "MMM d") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <MobileSummaryCards
              received={summaryData.received}
              expenses={summaryData.expenses}
              profit={summaryData.profit}
              pending={summaryData.pending}
              isLoading={isLoading}
            />

            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={mobileView === "summary" ? "secondary" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMobileView("summary")}
              >
                Summary
              </Button>
              <Button
                variant={mobileView === "transactions" ? "secondary" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMobileView("transactions")}
              >
                Transactions
              </Button>
            </div>

            {/* Content based on view */}
            {mobileView === "summary" ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Recent Activity
                </h3>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  transactions.slice(0, 10).map((transaction) => (
                    <MobileTransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      onTogglePaid={handleTogglePaid}
                      onEdit={handleEditTransaction}
                      canTogglePaid={canEditTransaction(transaction)}
                      canEdit={canEditTransaction(transaction)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No transactions yet
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    All Transactions
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {transactions?.length || 0} total
                  </span>
                </div>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <MobileTransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      onTogglePaid={handleTogglePaid}
                      onEdit={handleEditTransaction}
                      canTogglePaid={canEditTransaction(transaction)}
                      canEdit={canEditTransaction(transaction)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No transactions yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FAB for adding transaction */}
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 hover:shadow-glow transition-all duration-200"
          onClick={() => {
            setEditingTransaction(null);
            setTransactionModalOpen(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>

        <TransactionModal
          open={transactionModalOpen}
          onOpenChange={(open) => {
            setTransactionModalOpen(open);
            if (!open) setEditingTransaction(null);
          }}
          transaction={editingTransaction}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Page title */}
        <div className="space-y-1">
          <h1 className="page-title text-foreground">Finances</h1>
        </div>

        {/* Summary Cards */}
        <FinanceSummaryCards
          received={summaryData.received}
          expenses={summaryData.expenses}
          profit={summaryData.profit}
          pending={summaryData.pending}
          exchangeRateEffective={exchangeSummary.rate}
          profitAdjusted={adjustedProfit}
          isLoading={isLoading}
        />
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="bg-muted/50 p-1 rounded-xl">
                {canSeeHoldings && (
                  <TabsTrigger value="holders" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Holdings
                  </TabsTrigger>
                )}
                <TabsTrigger value="ledger" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Ledger
            </TabsTrigger>
                <TabsTrigger value="categories" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Categories
            </TabsTrigger>
              </TabsList>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Date Range</div>
                    <div className="flex gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">From</label>
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">To</label>
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          className="p-3 pointer-events-auto"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                      {dateFrom && dateTo
                        ? `${format(dateFrom, "MMM d")} ??? ${format(dateTo, "MMM d, yyyy")}`
                        : dateFrom
                        ? `From ${format(dateFrom, "MMM d, yyyy")}`
                        : dateTo
                        ? `Until ${format(dateTo, "MMM d, yyyy")}`
                        : "Select dates"}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant={isThisMonth ? "secondary" : "ghost"}
                size="sm"
                className="h-9"
                onClick={() => {
                  setDateFrom(startOfMonth(new Date()));
                  setDateTo(endOfMonth(new Date()));
                }}
              >
                This Month
              </Button>
              <Button
                variant={isAllTime ? "secondary" : "ghost"}
                size="sm"
                className="h-9"
                onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
              >
                All Time
              </Button>
            </div>
          </div>
          </div>

          {canSeeHoldings && (
            <TabsContent value="holders" className="mt-4">
              <HoldersView />
            </TabsContent>
          )}

          <TabsContent value="ledger" className="mt-4">
            <LedgerView dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <CategoriesView dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
