import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, 
  CalendarIcon, 
  Search,
  AlertTriangle,
  Loader2 
} from "lucide-react";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { TransactionModal } from "@/components/finances/TransactionModal";
import { useQueryClient } from "@tanstack/react-query";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator, PullToRefreshContainer } from "@/components/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";

import { useBookingsBoard } from "./useBookingsBoard";
import { FixBar } from "./FixBar";
import { KPIStrip } from "./KPIStrip";
import { BookingCard } from "./BookingCard";
import { LooseTransactionsSection } from "./LooseTransactionsSection";
import { AddMenu } from "./AddMenu";
import { ProblemFilter } from "./types";

export function BookingsBoard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Date filter state
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [problemFilter, setProblemFilter] = useState<ProblemFilter>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);

  // Modal state
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [defaultKind, setDefaultKind] = useState<"in" | "out">("in");
  const [defaultConfirmationId, setDefaultConfirmationId] = useState<string | undefined>();

  // Data
  const {
    bookings,
    looseTransactions,
    problemCounts,
    kpiData,
    isLoading,
    confirmations,
  } = useBookingsBoard({
    dateFrom,
    dateTo,
    searchQuery,
    problemFilter,
    onlyProblems,
  });

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["confirmations"] });
    await queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [queryClient]);

  const { containerRef, isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !isMobile,
  });

  // Date presets
  const isThisMonth =
    dateFrom?.getTime() === startOfMonth(new Date()).getTime() &&
    dateTo?.getTime() === endOfMonth(new Date()).getTime();
  const isAllTime = !dateFrom && !dateTo;

  // Handlers
  const handleAddPayment = (bookingId?: string) => {
    setDefaultKind("in");
    setDefaultConfirmationId(bookingId);
    setTransactionModalOpen(true);
  };

  const handleAddExpense = (bookingId?: string) => {
    setDefaultKind("out");
    setDefaultConfirmationId(bookingId);
    setTransactionModalOpen(true);
  };

  const handleAddBooking = () => {
    navigate("/new");
  };

  // Show loose transactions when filter is "loose"
  const showLoose = problemFilter === "loose" || problemFilter === null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="px-4 py-3">
          {/* Row 1: Back + Title + Currency */}
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold flex-1">Bookings</h1>
            <CurrencyToggle size="sm" />
          </div>

          {/* Row 2: Date Presets + Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date presets */}
            <div className="flex gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {dateFrom ? format(dateFrom, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="p-2 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {dateTo ? format(dateTo, "MMM d") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="p-2 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              variant={isThisMonth ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs"
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
              className="h-8 text-xs"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
            >
              All Time
            </Button>

            {/* Search */}
            <div className="relative flex-1 min-w-[120px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>

            {/* Only Problems Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="only-problems"
                checked={onlyProblems}
                onCheckedChange={setOnlyProblems}
              />
              <Label htmlFor="only-problems" className="text-xs cursor-pointer flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="hidden sm:inline">Problems</span>
              </Label>
            </div>
          </div>
        </div>

        {/* Fix Bar */}
        <FixBar
          counts={problemCounts}
          activeFilter={problemFilter}
          onFilterChange={setProblemFilter}
        />
      </div>

      {/* KPI Strip */}
      <KPIStrip
        received={kpiData.received}
        expenses={kpiData.expenses}
        profit={kpiData.profit}
        pending={kpiData.pending}
        bookingsCount={kpiData.bookingsCount}
        transactionsCount={kpiData.transactionsCount}
        isLoading={isLoading}
      />

      {/* Main Content */}
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
          {/* Loose Transactions (when filter is loose or no filter) */}
          {showLoose && (
            <LooseTransactionsSection 
              transactions={looseTransactions} 
              confirmations={confirmations}
            />
          )}

          {/* Booking Cards */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onAddPayment={handleAddPayment}
                  onAddExpense={handleAddExpense}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery || problemFilter || onlyProblems
                  ? "No bookings match your filters"
                  : "No bookings found"}
              </p>
            </div>
          )}
        </div>
      </PullToRefreshContainer>

      {/* Floating Add Menu */}
      <AddMenu
        onAddPayment={() => handleAddPayment()}
        onAddExpense={() => handleAddExpense()}
        onAddBooking={handleAddBooking}
      />

      {/* Transaction Modal */}
      <TransactionModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
        defaultKind={defaultKind}
        defaultConfirmationId={defaultConfirmationId}
        defaultCategory={defaultKind === "in" ? "tour_payment" : undefined}
      />
    </div>
  );
}
