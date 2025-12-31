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
import { Plus, Eye, Edit, Copy, Trash2, FileText, Search, X, LogOut, Shield, CalendarIcon, Paperclip, CheckCircle, Mail, ClipboardCheck, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useConfirmations,
  useDeleteConfirmation,
  useDuplicateConfirmation,
} from "@/hooks/useConfirmations";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import rtgLogoFull from "@/assets/rtg-logo-full.png";

export function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isAccountant, canEdit, role } = useUserRole();
  const { data: confirmations, isLoading, error } = useConfirmations();
  
  // Admin "View as" feature
  const [viewAsRole, setViewAsRole] = useState<string | null>(null);
  
  // Effective role (for "View as" feature - only affects UI display, not actual permissions)
  const effectiveRole = viewAsRole || role;
  const effectiveCanEdit = viewAsRole ? (viewAsRole === "admin" || viewAsRole === "worker") : canEdit;
  const effectiveIsVisitor = viewAsRole ? viewAsRole === "visitor" : role === "visitor";
  const effectiveIsBooking = viewAsRole ? viewAsRole === "booking" : role === "booking";
  const effectiveCanManageConfirmations = effectiveCanEdit; // Only admin/worker can edit, duplicate, create, delete, send emails
  
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
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading confirmations: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img 
              src={rtgLogoFull} 
              alt="Royal Georgian Tours" 
              className="h-20 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Royal Georgian Tours</h1>
              <p className="text-muted-foreground text-sm">Tour Confirmation Management</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {effectiveCanManageConfirmations && (
              <Button variant="outline" onClick={() => navigate("/saved-data")}>
                Saved Data
              </Button>
            )}
            {isAdmin && !viewAsRole && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            {isAdmin && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={viewAsRole ? "secondary" : "outline"} 
                    size="icon"
                    title={viewAsRole ? `Viewing as ${viewAsRole}` : "View as..."}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="end">
                  <div className="space-y-1">
                    <Button
                      variant={viewAsRole === null ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => setViewAsRole(null)}
                    >
                      My Role ({role})
                    </Button>
                    <Button
                      variant={viewAsRole === "worker" ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => setViewAsRole("worker")}
                    >
                      Worker
                    </Button>
                    <Button
                      variant={viewAsRole === "visitor" ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => setViewAsRole("visitor")}
                    >
                      Visitor
                    </Button>
                    <Button
                      variant={viewAsRole === "booking" ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => setViewAsRole("booking")}
                    >
                      Booking
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {effectiveCanManageConfirmations && (
              <Button onClick={() => navigate("/new")} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                New Confirmation
              </Button>
            )}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user?.email}</span>
                {role && (
                  <Badge 
                    variant={role === "admin" ? "default" : role === "worker" ? "secondary" : "outline"}
                    className="text-xs capitalize"
                  >
                    {role}
                  </Badge>
                )}
                {viewAsRole && (
                  <Badge variant="outline" className="text-xs">
                    → {viewAsRole}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Confirmations</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : confirmations?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-500/10">
                  <FileText className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month Arrivals</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
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
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quick Actions</p>
                <p className="text-lg font-medium text-foreground mt-1">
                  {effectiveCanManageConfirmations ? "Create new tour" : effectiveIsBooking ? "Send booking requests" : "View-only access"}
                </p>
              </div>
              <div className="flex gap-2">
                {(isAdmin || isAccountant) && (
                  <Button variant="outline" size="icon" onClick={() => navigate("/finances")} title="Finances">
                    <DollarSign className="h-4 w-4" />
                  </Button>
                )}
                {effectiveIsBooking && !effectiveCanManageConfirmations && (
                  <Button variant="outline" onClick={() => navigate("/create-booking-request")}>
                    <Mail className="h-4 w-4 mr-2" />
                    Booking Request
                  </Button>
                )}
                {effectiveCanManageConfirmations && (
                  <>
                    <Button variant="outline" size="icon" onClick={() => navigate("/create-booking-request")} title="Booking Request">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigate("/new")} title="New Confirmation">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
        <Card>
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
                {!hasActiveFilters && effectiveCanManageConfirmations && (
                  <Button onClick={() => navigate("/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Confirmation
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Client</TableHead>
                      <TableHead className="font-semibold">Arrival</TableHead>
                      <TableHead className="font-semibold">Source</TableHead>
                      <TableHead className="font-semibold">Duration</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
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
                          className="cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => navigate(`/confirmation/${confirmation.id}`)}
                        >
                          <TableCell className="font-mono font-semibold text-primary">
                            <div className="flex items-center gap-2">
                              {confirmation.status === 'draft' && (
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                                  Draft
                                </Badge>
                              )}
                              {(confirmation as any).is_paid && (
                                <span title="Paid">
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
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {confirmation.client_paid && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-emerald-600 cursor-default"
                                title="Payment Received"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {(effectiveIsBooking || effectiveCanManageConfirmations) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/confirmation/${confirmation.id}/attachments`)}
                                title="Invoices"
                                className={confirmation.is_paid ? "text-emerald-600 hover:text-emerald-700" : ""}
                              >
                                <Paperclip className="h-4 w-4" />
                              </Button>
                            )}
                            {effectiveCanManageConfirmations && (
                              <>
                                {confirmation.status === 'draft' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      navigate(`/confirmation/${confirmation.id}/edit?complete=true`)
                                    }
                                    title="Complete Draft"
                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  >
                                    <ClipboardCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    navigate(`/confirmation/${confirmation.id}/edit`)
                                  }
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDuplicate(confirmation.id)}
                                  disabled={duplicateMutation.isPending}
                                  title="Duplicate"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
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
