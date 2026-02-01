import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parse, isAfter, isBefore, isEqual, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Eye, Edit, Copy, Trash2, FileText, Search, X, CalendarIcon, Paperclip, CheckCircle, Mail, ClipboardCheck, DollarSign, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useConfirmations,
  useDeleteConfirmation,
  useDuplicateConfirmation,
} from "@/hooks/useConfirmations";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileConfirmationCard } from "@/components/MobileConfirmationCard";
import { useViewAs } from "@/contexts/ViewAsContext";

export function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin, isAccountant, isWorker, isCoworker, canEdit, role } = useUserRole();
  const { data: confirmations, isLoading, error } = useConfirmations();
  const isMobile = useIsMobile();
  
  // Admin "View as" feature
  const { viewAsRole, setViewAsRole } = useViewAs();
  
  // Effective role (for "View as" feature - only affects UI display, not actual permissions)
  const effectiveRole = viewAsRole || role;
  const effectiveCanEdit = viewAsRole
    ? ["admin", "worker", "accountant", "coworker"].includes(viewAsRole)
    : canEdit;
  const effectiveIsVisitor = viewAsRole ? viewAsRole === "visitor" : role === "visitor";
  const effectiveIsBooking = viewAsRole ? viewAsRole === "accountant" : role === "accountant";
  const effectiveCanEditConfirmations = viewAsRole
    ? ["admin", "worker", "coworker"].includes(viewAsRole)
    : isAdmin || isWorker || isCoworker;
  const effectiveCanDeleteConfirmations = viewAsRole
    ? ["admin", "worker"].includes(viewAsRole)
    : isAdmin || isWorker;
  
  // Actual permissions - admin always has full access regardless of "View as" setting
  const actualCanEdit = canEdit;
  const actualIsVisitor = role === "visitor";
  const deleteMutation = useDeleteConfirmation();
  const duplicateMutation = useDuplicateConfirmation();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const handleDuplicate = async (id: string) => {
    const result = await duplicateMutation.mutateAsync(id);
    navigate(`/confirmation/${result.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  // Parse arrival date helper (dd/mm/yyyy format)
  const parseArrivalDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    try {
      return parse(dateStr, "dd/MM/yyyy", new Date());
    } catch {
      return null;
    }
  };

  // Filter and sort confirmations
  const filteredConfirmations = useMemo(() => {
    if (!confirmations) return [];

    const filtered = confirmations.filter((c) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.confirmation_code?.toLowerCase().includes(searchLower) ||
        c.main_client_name?.toLowerCase().includes(searchLower) ||
        c.tour_source?.toLowerCase().includes(searchLower);

      // Month filter (based on arrival date)
      let matchesMonth = true;
      if (filterMonth === "this-month" || filterMonth === "last-month" || filterMonth === "next-month") {
        const arrivalDate = parseArrivalDate(c.arrival_date);
        if (!arrivalDate) {
          matchesMonth = false;
        } else {
          const now = new Date();
          if (filterMonth === "this-month") {
            matchesMonth =
              arrivalDate.getMonth() === now.getMonth() &&
              arrivalDate.getFullYear() === now.getFullYear();
          } else if (filterMonth === "last-month") {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            matchesMonth =
              arrivalDate.getMonth() === lastMonth.getMonth() &&
              arrivalDate.getFullYear() === lastMonth.getFullYear();
          } else if (filterMonth === "next-month") {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            matchesMonth =
              arrivalDate.getMonth() === nextMonth.getMonth() &&
              arrivalDate.getFullYear() === nextMonth.getFullYear();
          }
        }
      }
      // For "all" and "custom", we don't filter by month (custom uses date range)

      // Date range filter (based on arrival date)
      let matchesDateRange = true;
      if (dateFrom || dateTo) {
        const arrivalDate = parseArrivalDate(c.arrival_date);
        if (arrivalDate) {
          const arrivalDay = startOfDay(arrivalDate);
          if (dateFrom && dateTo) {
            matchesDateRange =
              (isAfter(arrivalDay, startOfDay(dateFrom)) || isEqual(arrivalDay, startOfDay(dateFrom))) &&
              (isBefore(arrivalDay, startOfDay(dateTo)) || isEqual(arrivalDay, startOfDay(dateTo)));
          } else if (dateFrom) {
            matchesDateRange = isAfter(arrivalDay, startOfDay(dateFrom)) || isEqual(arrivalDay, startOfDay(dateFrom));
          } else if (dateTo) {
            matchesDateRange = isBefore(arrivalDay, startOfDay(dateTo)) || isEqual(arrivalDay, startOfDay(dateTo));
          }
        } else {
          matchesDateRange = false; // No arrival date, exclude from date filter
        }
      }

      return matchesSearch && matchesMonth && matchesDateRange;
    });

    // Sort by arrival date (recent to old)
    return filtered.sort((a, b) => {
      const dateA = parseArrivalDate(a.arrival_date);
      const dateB = parseArrivalDate(b.arrival_date);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // No date goes to end
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime(); // Recent first
    });
  }, [confirmations, searchQuery, filterMonth, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterMonth("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || filterMonth !== "all" || dateFrom || dateTo;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading confirmations: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-xs text-muted-foreground">Arrivals, confirmations, and quick actions.</p>
          </div>

          {/* Mobile Stats */}
          <div className="px-4 py-4">
            <div className="flex gap-3">
              <div className="stat-card p-4 flex-1">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground stat-number">
                  {isLoading ? "..." : confirmations?.length || 0}
                </p>
              </div>
              <div className="stat-card p-4 flex-1">
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-accent stat-number">
                  {isLoading
                    ? "..."
                    : confirmations?.filter((c) => {
                        const arrivalDate = parseArrivalDate(c.arrival_date);
                        if (!arrivalDate) return false;
                        const now = new Date();
                        return (
                          arrivalDate.getMonth() === now.getMonth() &&
                          arrivalDate.getFullYear() === now.getFullYear()
                        );
                      }).length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Search & Filters */}
          <div className="px-4 pb-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <Button
                variant={showMobileFilters || hasActiveFilters ? "secondary" : "outline"}
                size="icon"
                className="h-11 w-11 flex-shrink-0"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Collapsible filter options */}
            {showMobileFilters && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {["all", "this-month", "last-month", "next-month"].map((filter) => (
                    <Button
                      key={filter}
                      variant={filterMonth === filter && !dateFrom && !dateTo ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        setFilterMonth(filter);
                        setDateFrom(undefined);
                        setDateTo(undefined);
                        setShowCustomDatePicker(false);
                      }}
                    >
                      {filter === "all" && "All"}
                      {filter === "this-month" && "This Month"}
                      {filter === "last-month" && "Last Month"}
                      {filter === "next-month" && "Next Month"}
                    </Button>
                  ))}
                  <Popover open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={(dateFrom || dateTo) ? "secondary" : "outline"}
                        size="sm"
                      >
                        <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                        {dateFrom && dateTo
                          ? `${format(dateFrom, "MMM d")} - ${format(dateTo, "MMM d")}`
                          : "Custom"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground">Select date range</div>
                        <Calendar
                          mode="range"
                          selected={{ from: dateFrom, to: dateTo }}
                          onSelect={(range) => {
                            setDateFrom(range?.from);
                            setDateTo(range?.to);
                            if (range?.from && range?.to) {
                              setFilterMonth("custom");
                            }
                          }}
                          numberOfMonths={1}
                          className="pointer-events-auto"
                        />
                        {(dateFrom || dateTo) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setDateFrom(undefined);
                              setDateTo(undefined);
                              setFilterMonth("all");
                              setShowCustomDatePicker(false);
                            }}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Mobile Confirmation List */}
          <div className="px-4 pb-24 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredConfirmations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {hasActiveFilters ? "No matching confirmations" : "No confirmations yet"}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {hasActiveFilters ? "Try adjusting your filters" : "Create your first confirmation"}
                </p>
              </div>
            ) : (
              filteredConfirmations.map((confirmation) => (
                <MobileConfirmationCard
                  key={confirmation.id}
                  confirmation={confirmation}
                  canEditConfirmations={effectiveCanEditConfirmations}
                  canDeleteConfirmations={effectiveCanDeleteConfirmations}
                  effectiveIsBooking={effectiveIsBooking}
                  effectiveIsVisitor={effectiveIsVisitor}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* Mobile FAB for new confirmation */}
        {effectiveCanEditConfirmations && (
          <Button
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 hover:shadow-glow transition-all duration-200"
            onClick={() => navigate("/new")}
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="stat-card">
            <CardContent className="py-5 px-5">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Confirmations</p>
                  <p className="text-2xl font-bold text-foreground stat-number mt-0.5">
                    {isLoading ? <Skeleton className="h-7 w-14" /> : confirmations?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="stat-card">
            <CardContent className="py-5 px-5">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month Arrivals</p>
                  <p className="text-2xl font-bold text-foreground stat-number mt-0.5">
                    {isLoading ? (
                      <Skeleton className="h-7 w-14" />
                    ) : (
                      confirmations?.filter((c) => {
                        const arrivalDate = parseArrivalDate(c.arrival_date);
                        if (!arrivalDate) return false;
                        const now = new Date();
                        return (
                          arrivalDate.getMonth() === now.getMonth() &&
                          arrivalDate.getFullYear() === now.getFullYear()
                        );
                      }).length || 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="stat-card">
            <CardContent className="py-5 px-5 flex items-center justify-between h-full">
              <div className="flex flex-col">
                {effectiveCanEditConfirmations ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg border-[#BFE3E6] bg-[#EAF3F4] text-[#0F4C5C] hover:bg-accent hover:text-accent-foreground"
                    onClick={() => navigate("/new")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="text-[13px] font-semibold">New Confirmation</span>
                  </Button>
                ) : (
                  <p className="text-base font-medium text-foreground mt-1">
                    {effectiveIsBooking ? "Send booking requests" : "View-only access"}
                  </p>
                )}
              </div>
            </CardContent>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="mb-4 border-border/60 shadow-none bg-[#FCFCFB] dark:bg-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <Input
                  placeholder="Search by code, client name, or source..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-between">
                    <span>
                      {filterMonth === "all" && !dateFrom && !dateTo && "All time"}
                      {filterMonth === "this-month" && "This month"}
                      {filterMonth === "last-month" && "Last month"}
                      {filterMonth === "next-month" && "Next month"}
                      {filterMonth === "custom" && (dateFrom || dateTo) && "Custom range"}
                    </span>
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-2 space-y-1">
                    <Button
                      variant={filterMonth === "all" && !dateFrom && !dateTo ? "secondary" : "ghost"}
                      className="w-full justify-start text-sm"
                      onClick={() => { setFilterMonth("all"); setDateFrom(undefined); setDateTo(undefined); }}
                    >
                      All time
                    </Button>
                    <Button
                      variant={filterMonth === "this-month" ? "secondary" : "ghost"}
                      className="w-full justify-start text-sm"
                      onClick={() => { setFilterMonth("this-month"); setDateFrom(undefined); setDateTo(undefined); }}
                    >
                      This month
                    </Button>
                    <Button
                      variant={filterMonth === "last-month" ? "secondary" : "ghost"}
                      className="w-full justify-start text-sm"
                      onClick={() => { setFilterMonth("last-month"); setDateFrom(undefined); setDateTo(undefined); }}
                    >
                      Last month
                    </Button>
                    <Button
                      variant={filterMonth === "next-month" ? "secondary" : "ghost"}
                      className="w-full justify-start text-sm"
                      onClick={() => { setFilterMonth("next-month"); setDateFrom(undefined); setDateTo(undefined); }}
                    >
                      Next month
                    </Button>
                  </div>
                  <div className="border-t px-2 py-2">
                    <p className="text-xs text-muted-foreground mb-2">Custom range</p>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            {dateFrom ? format(dateFrom, "dd/MM/yy") : "From"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={(date) => { setDateFrom(date); setFilterMonth("custom"); }}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            {dateTo ? format(dateTo, "dd/MM/yy") : "To"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={(date) => { setDateTo(date); setFilterMonth("custom"); }}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {hasActiveFilters && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing {filteredConfirmations.length} of {confirmations?.length || 0} confirmations
              </p>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-blue-50/50 dark:bg-card">
          <CardHeader>
            <CardTitle>Recent Confirmations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredConfirmations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {hasActiveFilters ? "No matching confirmations" : "No confirmations yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? "Try adjusting your search or filters"
                    : "Create your first tour confirmation letter"}
                </p>
                {!hasActiveFilters && effectiveCanEditConfirmations && (
                  <Button onClick={() => navigate("/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Confirmation
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 border-b border-border/60">
                      <TableHead className="font-medium text-[#6B7280] text-[11px] uppercase tracking-widest">Code</TableHead>
                      <TableHead className="font-medium text-[#6B7280] text-[11px] uppercase tracking-widest">Client</TableHead>
                      <TableHead className="font-medium text-[#6B7280] text-[11px] uppercase tracking-widest">Arrival</TableHead>
                      <TableHead className="font-medium text-[#6B7280] text-[11px] uppercase tracking-widest">Source</TableHead>
                      <TableHead className="font-medium text-[#6B7280] text-[11px] uppercase tracking-widest">Duration</TableHead>
                      <TableHead className="font-medium text-[#6B7280] text-[11px] uppercase tracking-widest text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConfirmations.map((confirmation) => {
                      // Check if confirmation was edited (updated_at differs from created_at by more than 1 minute)
                      const createdAt = new Date(confirmation.created_at).getTime();
                      const updatedAt = new Date(confirmation.updated_at).getTime();
                      const wasEdited = updatedAt - createdAt > 60000; // More than 1 minute difference

                      return (
                        <TableRow
                          key={confirmation.id}
                          className="cursor-pointer hover:bg-[#F6F8F8] transition-colors"
                          onClick={() => navigate(`/confirmation/${confirmation.id}`)}
                        >
                          <TableCell className="font-mono font-semibold text-primary tracking-tight">
                            <div className="flex items-center gap-2">
                              {confirmation.status === 'draft' && (
                                <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
                                  Draft
                                </Badge>
                              )}
                              {confirmation.client_paid && (
                                <span title="Payment Received">
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                </span>
                              )}
                              {confirmation.confirmation_code}
                              {wasEdited && !effectiveIsVisitor && (
                                <span className="text-xs text-muted-foreground font-normal">
                                  (edited)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {confirmation.main_client_name || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {confirmation.arrival_date || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {(() => {
                              const payload = confirmation.raw_payload as any;
                              const trackingNumber = payload?.trackingNumber;
                              if (trackingNumber) {
                                return trackingNumber;
                              }
                              return confirmation.tour_source || "—";
                            })()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {confirmation.total_days}D / {confirmation.total_nights}N
                          </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/confirmation/${confirmation.id}`)}
                              title="View"
                              className="text-[#9CA3AF] hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(effectiveIsBooking || effectiveCanEditConfirmations) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/confirmation/${confirmation.id}/attachments`)}
                                title="Invoices"
                                className={confirmation.is_paid ? "text-emerald-500 hover:text-emerald-600" : "text-[#9CA3AF] hover:text-foreground"}
                              >
                                <Paperclip className="h-4 w-4" />
                              </Button>
                            )}
                            {effectiveCanEditConfirmations && (
                              <>
                                {confirmation.status === 'draft' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      navigate(`/confirmation/${confirmation.id}/edit?complete=true`)
                                    }
                                    title="Complete Draft"
                                    className="text-[#9CA3AF] hover:text-amber-600 hover:bg-amber-50"
                                  >
                                    <ClipboardCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                {confirmation.status !== 'draft' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      navigate(`/confirmation/${confirmation.id}/edit`)
                                    }
                                    title="Edit"
                                    className="text-[#9CA3AF] hover:text-foreground"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {effectiveCanDeleteConfirmations && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-[#9CA3AF] hover:text-destructive"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete confirmation{" "}
                                          <strong>{confirmation.confirmation_code}</strong>? This
                                          action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(confirmation.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </>
                            )}
                          </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
