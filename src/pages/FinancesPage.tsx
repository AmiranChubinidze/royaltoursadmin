import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ArrowLeft, CalendarIcon, Filter, X, Plus, Loader2 } from "lucide-react";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useTransactions, useUpdateTransaction } from "@/hooks/useTransactions";
import { FinanceSummaryCards } from "@/components/finances/FinanceSummaryCards";
import { ConfirmationsView } from "@/components/finances/ConfirmationsView";
import { LedgerView } from "@/components/finances/LedgerView";
import { CategoriesView } from "@/components/finances/CategoriesView";
import { HoldersView } from "@/components/finances/HoldersView";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFinanceHeader } from "@/components/finances/MobileFinanceHeader";
import { MobileSummaryCards } from "@/components/finances/MobileSummaryCards";
import { MobileTransactionCard } from "@/components/finances/MobileTransactionCard";
import { TransactionModal } from "@/components/finances/TransactionModal";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator, PullToRefreshContainer } from "@/components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { CurrencyToggle } from "@/components/CurrencyToggle";

const DRIVER_RATES: Record<string, number> = {
  driver1: 50,
  driver2: 60,
};

export default function FinancesPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Date filter state
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState("holders");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileView, setMobileView] = useState<"summary" | "transactions">("summary");
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  const { data: confirmations, isLoading: confirmationsLoading } = useConfirmations();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({
    dateFrom,
    dateTo,
  });
  const updateTransaction = useUpdateTransaction();

  const isLoading = confirmationsLoading || transactionsLoading;

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["confirmations"] });
    await queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [queryClient]);

  const { containerRef, isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !isMobile,
  });

  // Parse date from DD/MM/YYYY format
  const parseConfirmationDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  // Compute summary values
  const summaryData = useMemo(() => {
    if (!confirmations || !transactions) {
      return { revenueExpected: 0, received: 0, expenses: 0, profit: 0, pending: 0 };
    }

    // Filter confirmations by date range
    const filteredConfirmations = confirmations.filter((c) => {
      if (!c.price || Number(c.price) <= 0) return false;
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
    });

    // Revenue Expected: sum of confirmation prices
    const revenueExpected = filteredConfirmations.reduce(
      (sum, c) => sum + (Number(c.price) || 0),
      0
    );

    // Received: sum of income transactions marked as paid
    const received = transactions
      .filter((t) => t.type === "income" && t.is_paid)
      .reduce((sum, t) => sum + t.amount, 0);

    // For confirmations without income transactions, use client_paid flag from confirmation
    const confirmationsWithoutIncomeTransactions = filteredConfirmations.filter((c) => {
      const hasIncomeTransaction = transactions.some(
        (t) => t.confirmation_id === c.id && t.type === "income"
      );
      return !hasIncomeTransaction && c.client_paid;
    });
    const receivedFromFlags = confirmationsWithoutIncomeTransactions.reduce(
      (sum, c) => sum + (Number(c.price) || 0),
      0
    );
    const totalReceived = received + receivedFromFlags;

    // Expenses: sum of expense transactions marked as paid + auto driver expenses
    const paidExpenses = transactions
      .filter((t) => t.type === "expense" && t.is_paid)
      .reduce((sum, t) => sum + t.amount, 0);

    // Auto driver expenses for confirmations without driver transactions
    const driverExpenses = filteredConfirmations
      .filter((c) => {
        const hasDriverTransaction = transactions.some(
          (t) => t.confirmation_id === c.id && t.category === "driver"
        );
        return !hasDriverTransaction;
      })
      .reduce((sum, c) => {
        const driverType = (c.raw_payload as any)?.driverType || "driver1";
        const driverRate = DRIVER_RATES[driverType] || 50;
        return sum + (c.total_days || 1) * driverRate;
      }, 0);

    const totalExpenses = paidExpenses + driverExpenses;

    // Profit = Received - Expenses
    const profit = totalReceived - totalExpenses;

    // Pending = Revenue Expected - Received
    const pending = revenueExpected - totalReceived;

    return {
      revenueExpected,
      received: totalReceived,
      expenses: totalExpenses,
      profit,
      pending,
    };
  }, [confirmations, transactions, dateFrom, dateTo]);

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    await updateTransaction.mutateAsync({ id, status: currentStatus ? "pending" : "confirmed" });
  };

  const isThisMonth =
    dateFrom?.getTime() === startOfMonth(new Date()).getTime() &&
    dateTo?.getTime() === endOfMonth(new Date()).getTime();
  const isAllTime = !dateFrom && !dateTo;

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileFinanceHeader />

        <PullToRefreshContainer
          ref={containerRef}
          className="flex-1 overflow-y-auto"
        >
          <PullToRefreshIndicator
            pullProgress={pullProgress}
            isRefreshing={isRefreshing}
            pullDistance={pullDistance}
          />

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
        </PullToRefreshContainer>

        {/* FAB for adding transaction */}
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setTransactionModalOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>

        <TransactionModal
          open={transactionModalOpen}
          onOpenChange={setTransactionModalOpen}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Finances</h1>
            <p className="text-sm text-muted-foreground">
              Track income, expenses, and profitability
            </p>
          </div>
          <CurrencyToggle size="default" />
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-3 pb-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
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
          <span className="text-muted-foreground">–</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
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

          <div className="flex gap-1 ml-2">
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

        {/* Summary Cards */}
        <FinanceSummaryCards
          revenueExpected={summaryData.revenueExpected}
          received={summaryData.received}
          expenses={summaryData.expenses}
          profit={summaryData.profit}
          pending={summaryData.pending}
          isLoading={isLoading}
        />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="holders" className="data-[state=active]:bg-background">
              Holdings
            </TabsTrigger>
            <TabsTrigger value="confirmations" className="data-[state=active]:bg-background">
              Confirmations
            </TabsTrigger>
            <TabsTrigger value="ledger" className="data-[state=active]:bg-background">
              Ledger
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-background">
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holders" className="mt-4">
            <HoldersView onHolderClick={(holderId) => {
              setActiveTab("ledger");
              // TODO: Add holder filter to ledger
            }} />
          </TabsContent>

          <TabsContent value="confirmations" className="mt-4">
            <ConfirmationsView dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>

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
