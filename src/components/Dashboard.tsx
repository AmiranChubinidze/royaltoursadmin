import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Edit, Copy, Trash2, FileText, Search, X, LogOut, Shield } from "lucide-react";
import {
  useConfirmations,
  useDeleteConfirmation,
  useDuplicateConfirmation,
} from "@/hooks/useConfirmations";
import { Skeleton } from "@/components/ui/skeleton";
import { COMPANY_INFO } from "@/types/confirmation";
import { useAuth } from "@/hooks/useAuth";

export function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: confirmations, isLoading, error } = useConfirmations();
  const deleteMutation = useDeleteConfirmation();
  const duplicateMutation = useDuplicateConfirmation();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const handleDuplicate = async (id: string) => {
    const result = await duplicateMutation.mutateAsync(id);
    navigate(`/confirmation/${result.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  // Filter confirmations
  const filteredConfirmations = useMemo(() => {
    if (!confirmations) return [];

    return confirmations.filter((c) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.confirmation_code?.toLowerCase().includes(searchLower) ||
        c.main_client_name?.toLowerCase().includes(searchLower) ||
        c.tour_source?.toLowerCase().includes(searchLower);

      // Month filter
      let matchesMonth = true;
      if (filterMonth !== "all") {
        const date = new Date(c.created_at);
        const now = new Date();
        if (filterMonth === "this-month") {
          matchesMonth =
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
        } else if (filterMonth === "last-month") {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          matchesMonth =
            date.getMonth() === lastMonth.getMonth() &&
            date.getFullYear() === lastMonth.getFullYear();
        }
      }

      return matchesSearch && matchesMonth;
    });
  }, [confirmations, searchQuery, filterMonth]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterMonth("all");
  };

  const hasActiveFilters = searchQuery || filterMonth !== "all";

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
          <div>
            <h1 className="text-3xl font-bold text-foreground">{COMPANY_INFO.name}</h1>
            <p className="text-muted-foreground mt-1">Tour Confirmation Management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/saved-data")}>
              Saved Data
            </Button>
            {user?.email === "am1ko.ch4b1n1dze@gmail.com" && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button onClick={() => navigate("/new")} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              New Confirmation
            </Button>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
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
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      confirmations?.filter((c) => {
                        const date = new Date(c.created_at);
                        const now = new Date();
                        return (
                          date.getMonth() === now.getMonth() &&
                          date.getFullYear() === now.getFullYear()
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
                <p className="text-lg font-medium text-foreground mt-1">Create new tour</p>
              </div>
              <Button variant="outline" onClick={() => navigate("/new")}>
                <Plus className="h-4 w-4" />
              </Button>
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
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="last-month">Last month</SelectItem>
                </SelectContent>
              </Select>
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
                {!hasActiveFilters && (
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
                              {confirmation.confirmation_code}
                              {wasEdited && (
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
