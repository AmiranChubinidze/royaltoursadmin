import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CalendarIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Car,
  CircleDollarSign,
  Building2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useConfirmations } from "@/hooks/useConfirmations";
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  Expense,
  CreateExpenseData,
} from "@/hooks/useExpenses";
import { useToast } from "@/hooks/use-toast";

const EXPENSE_TYPES = [
  { value: "driver", label: "Driver", icon: Car },
  { value: "fuel", label: "Fuel" },
  { value: "hotel", label: "Hotel" },
  { value: "meal", label: "Meals" },
  { value: "guide", label: "Guide Fee" },
  { value: "other", label: "Other" },
];

const DRIVER_RATE_PER_DAY = 50;

export default function FinancesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: confirmations, isLoading: confirmationsLoading } = useConfirmations();
  const queryClient = useQueryClient();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  // Date filter state
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));

  // Dialog state
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<CreateExpenseData>({
    expense_type: "other",
    description: "",
    amount: 0,
    expense_date: format(new Date(), "yyyy-MM-dd"),
    confirmation_id: null,
  });

  const isLoading = confirmationsLoading || expensesLoading;

  // Calculate income from confirmations with price
  const incomeData = useMemo(() => {
    if (!confirmations) return [];
    
    return confirmations
      .filter((c) => {
        // Use the price column directly
        const price = c.price;
        if (!price || price <= 0) return false;
        
        // Filter by date range based on arrival_date
        if (dateFrom || dateTo) {
          if (!c.arrival_date) return false;
          const parts = c.arrival_date.split("/");
          if (parts.length !== 3) return false;
          const arrivalDate = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
          );
          
          if (dateFrom && dateTo) {
            return isWithinInterval(arrivalDate, { start: dateFrom, end: dateTo });
          }
          if (dateFrom) return arrivalDate >= dateFrom;
          if (dateTo) return arrivalDate <= dateTo;
        }
        
        return true;
      })
      .map((c) => ({
        id: c.id,
        code: c.confirmation_code,
        client: c.main_client_name,
        arrivalDate: c.arrival_date,
        departureDate: c.departure_date,
        price: Number(c.price) || 0,
        clientPaid: c.client_paid || false,  // Client paid us
        hotelsPaid: c.is_paid || false,       // We paid hotels
        totalDays: c.total_days || 1,
      }));
  }, [confirmations, dateFrom, dateTo]);

  // Toggle client paid status
  const toggleClientPaid = async (id: string, currentStatus: boolean) => {
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
        description: !currentStatus ? "Client payment has been recorded." : "Payment status cleared."
      });
    } catch (error) {
      toast({ title: "Error updating payment status", variant: "destructive" });
    }
  };

  // Toggle hotels paid status
  const toggleHotelsPaid = async (id: string, currentStatus: boolean) => {
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
      toast({ title: "Error updating payment status", variant: "destructive" });
    }
  };

  // Calculate driver expenses (auto-calculated $50/day per confirmation)
  const driverExpenses = useMemo(() => {
    if (!confirmations) return [];
    
    return confirmations
      .filter((c) => {
        if (dateFrom || dateTo) {
          if (!c.arrival_date) return false;
          const parts = c.arrival_date.split("/");
          if (parts.length !== 3) return false;
          const arrivalDate = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
          );
          
          if (dateFrom && dateTo) {
            return isWithinInterval(arrivalDate, { start: dateFrom, end: dateTo });
          }
          if (dateFrom) return arrivalDate >= dateFrom;
          if (dateTo) return arrivalDate <= dateTo;
        }
        return true;
      })
      .map((c) => ({
        id: `driver-${c.id}`,
        confirmationId: c.id,
        confirmationCode: c.confirmation_code,
        client: c.main_client_name,
        totalDays: c.total_days || 1,
        amount: (c.total_days || 1) * DRIVER_RATE_PER_DAY,
        date: c.arrival_date,
      }));
  }, [confirmations, dateFrom, dateTo]);

  // Filter manual expenses by date
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    
    return expenses.filter((e) => {
      if (dateFrom || dateTo) {
        const expenseDate = parseISO(e.expense_date);
        if (dateFrom && dateTo) {
          return isWithinInterval(expenseDate, { start: dateFrom, end: dateTo });
        }
        if (dateFrom) return expenseDate >= dateFrom;
        if (dateTo) return expenseDate <= dateTo;
      }
      return true;
    });
  }, [expenses, dateFrom, dateTo]);

  // Calculate totals
  const totalIncome = incomeData.reduce((sum, i) => sum + i.price, 0);
  const receivedIncome = incomeData.filter(i => i.clientPaid).reduce((sum, i) => sum + i.price, 0);
  const pendingIncome = totalIncome - receivedIncome;
  const totalDriverExpenses = driverExpenses.reduce((sum, d) => sum + d.amount, 0);
  const totalManualExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpenses = totalDriverExpenses + totalManualExpenses;
  const netProfit = totalIncome - totalExpenses;

  const handleOpenExpenseDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        expense_type: expense.expense_type,
        description: expense.description || "",
        amount: Number(expense.amount),
        expense_date: expense.expense_date,
        confirmation_id: expense.confirmation_id,
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        expense_type: "other",
        description: "",
        amount: 0,
        expense_date: format(new Date(), "yyyy-MM-dd"),
        confirmation_id: null,
      });
    }
    setIsExpenseDialogOpen(true);
  };

  const handleSaveExpense = async () => {
    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, ...expenseForm });
        toast({ title: "Expense updated" });
      } else {
        await createExpense.mutateAsync(expenseForm);
        toast({ title: "Expense added" });
      }
      setIsExpenseDialogOpen(false);
    } catch (error) {
      toast({ title: "Error saving expense", variant: "destructive" });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast({ title: "Expense deleted" });
    } catch (error) {
      toast({ title: "Error deleting expense", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Finances</h1>
            <p className="text-muted-foreground">Income and expenses overview</p>
          </div>
        </div>

        {/* Date Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label className="text-sm mb-1.5 block">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM d, yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setDateFrom(startOfMonth(new Date()));
                  setDateTo(endOfMonth(new Date()));
                }}
              >
                This Month
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
              >
                All Time
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Income Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Received from Clients</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : `$${receivedIncome.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/20">
                  <Circle className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending from Clients</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : `$${pendingIncome.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-500/10">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : `$${totalIncome.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-500/10">
                  <TrendingDown className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : `$${totalExpenses.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-full",
                  netProfit >= 0 ? "bg-primary/10" : "bg-red-500/10"
                )}>
                  <DollarSign className={cn(
                    "h-6 w-6",
                    netProfit >= 0 ? "text-primary" : "text-red-500"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    netProfit >= 0 ? "text-primary" : "text-red-600"
                  )}>
                    {isLoading ? <Skeleton className="h-8 w-24" /> : `$${netProfit.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="income" className="space-y-4">
          <TabsList>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          {/* Income Tab */}
          <TabsContent value="income">
            <Card>
              <CardHeader>
                <CardTitle>Income from Confirmations</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : incomeData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No income recorded. Add prices to confirmations to track income.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Code</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Arrival</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-center">Received</TableHead>
                          <TableHead className="text-center">Hotels Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeData.map((income) => (
                          <TableRow
                            key={income.id}
                            className="hover:bg-muted/50"
                          >
                            <TableCell 
                              className="font-mono text-sm cursor-pointer"
                              onClick={() => navigate(`/confirmation/${income.id}`)}
                            >
                              {income.code}
                            </TableCell>
                            <TableCell 
                              className="font-medium cursor-pointer"
                              onClick={() => navigate(`/confirmation/${income.id}`)}
                            >
                              {income.client || "—"}
                            </TableCell>
                            <TableCell>{income.arrivalDate}</TableCell>
                            <TableCell>{income.totalDays}</TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600">
                              ${income.price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleClientPaid(income.id, income.clientPaid);
                                }}
                                title={income.clientPaid ? "Client has paid - Click to mark unpaid" : "Pending payment - Click to mark as received"}
                                className={cn(
                                  "h-8 w-8",
                                  income.clientPaid 
                                    ? "text-emerald-600 hover:text-emerald-700" 
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {income.clientPaid ? (
                                  <CircleDollarSign className="h-5 w-5" />
                                ) : (
                                  <Circle className="h-5 w-5" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleHotelsPaid(income.id, income.hotelsPaid);
                                }}
                                title={income.hotelsPaid ? "Hotels paid - Click to mark unpaid" : "Hotels unpaid - Click to mark as paid"}
                                className={cn(
                                  "h-8 w-8",
                                  income.hotelsPaid 
                                    ? "text-amber-600 hover:text-amber-700" 
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {income.hotelsPaid ? (
                                  <Building2 className="h-5 w-5" />
                                ) : (
                                  <Circle className="h-5 w-5" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 font-semibold">
                          <TableCell colSpan={4}>Total</TableCell>
                          <TableCell className="text-right text-emerald-600">
                            ${totalIncome.toLocaleString()}
                          </TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Expenses</CardTitle>
                <Button onClick={() => handleOpenExpenseDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Driver Expenses (Auto-calculated) */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Driver Expenses (Auto-calculated @ ${DRIVER_RATE_PER_DAY}/day)
                  </h3>
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : driverExpenses.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No driver expenses</p>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Confirmation</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-center">Days</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {driverExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell className="font-mono text-sm">
                                {expense.confirmationCode}
                              </TableCell>
                              <TableCell>{expense.client || "—"}</TableCell>
                              <TableCell>{expense.date}</TableCell>
                              <TableCell className="text-center">{expense.totalDays}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                ${expense.amount.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={4}>Subtotal</TableCell>
                            <TableCell className="text-right text-red-600">
                              ${totalDriverExpenses.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Manual Expenses */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    Other Expenses
                  </h3>
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : filteredExpenses.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">
                      No other expenses recorded
                    </p>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>
                                {format(parseISO(expense.expense_date), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {expense.expense_type}
                                </Badge>
                              </TableCell>
                              <TableCell>{expense.description || "—"}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                ${Number(expense.amount).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenExpenseDialog(expense)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this expense?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteExpense(expense.id)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={3}>Subtotal</TableCell>
                            <TableCell className="text-right text-red-600">
                              ${totalManualExpenses.toLocaleString()}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Total Expenses */}
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Expenses</span>
                    <span className="text-2xl font-bold text-red-600">
                      ${totalExpenses.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Type</Label>
              <Select
                value={expenseForm.expense_type}
                onValueChange={(value) =>
                  setExpenseForm((prev) => ({ ...prev, expense_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={expenseForm.description || ""}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, expense_date: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveExpense} disabled={createExpense.isPending || updateExpense.isPending}>
              {editingExpense ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
