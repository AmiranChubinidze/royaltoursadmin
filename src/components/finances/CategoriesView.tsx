import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTransactions, TransactionCategory } from "@/hooks/useTransactions";
import { useCurrency } from "@/contexts/CurrencyContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Clock, Receipt, Wallet, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface CategoriesViewProps {
  dateFrom?: Date;
  dateTo?: Date;
}

const CATEGORY_CONFIG: Record<TransactionCategory, { label: string; color: string; bgColor: string; chartColor: string }> = {
  tour_payment: { label: "Tour Payments", color: "text-emerald-600", bgColor: "bg-emerald-500", chartColor: "#10b981" },
  hotel: { label: "Hotels", color: "text-blue-600", bgColor: "bg-blue-500", chartColor: "#3b82f6" },
  driver: { label: "Driver", color: "text-purple-600", bgColor: "bg-purple-500", chartColor: "#8b5cf6" },
  sim: { label: "SIM Cards", color: "text-orange-600", bgColor: "bg-orange-500", chartColor: "#f97316" },
  breakfast: { label: "Breakfast", color: "text-yellow-600", bgColor: "bg-yellow-500", chartColor: "#eab308" },
  fuel: { label: "Fuel", color: "text-rose-600", bgColor: "bg-rose-500", chartColor: "#f43f5e" },
  guide: { label: "Guide Fees", color: "text-cyan-600", bgColor: "bg-cyan-500", chartColor: "#06b6d4" },
  other: { label: "Other", color: "text-gray-600", bgColor: "bg-gray-500", chartColor: "#6b7280" },
};

// Calculate percentage change
function calcChange(current: number, previous: number): { percent: number; direction: 'up' | 'down' | 'same' } {
  if (previous === 0 && current === 0) return { percent: 0, direction: 'same' };
  if (previous === 0) return { percent: 100, direction: 'up' };
  const percent = ((current - previous) / previous) * 100;
  return {
    percent: Math.abs(percent),
    direction: percent > 0.5 ? 'up' : percent < -0.5 ? 'down' : 'same',
  };
}

// Change indicator component
function ChangeIndicator({ current, previous, invertColors = false }: { current: number; previous: number; invertColors?: boolean }) {
  const { percent, direction } = calcChange(current, previous);
  
  if (direction === 'same') {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>0%</span>
      </span>
    );
  }

  const isPositive = direction === 'up';
  // For expenses, "up" is bad (red), for income "up" is good (green)
  const colorClass = invertColors
    ? isPositive ? 'text-rose-600' : 'text-emerald-600'
    : isPositive ? 'text-emerald-600' : 'text-rose-600';

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", colorClass)}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      <span>{percent.toFixed(1)}%</span>
    </span>
  );
}

export function CategoriesView({ dateFrom, dateTo }: CategoriesViewProps) {
  const { formatAmount } = useCurrency();

  // Calculate previous period dates
  const { prevDateFrom, prevDateTo } = useMemo(() => {
    if (!dateFrom || !dateTo) {
      // Default: this month vs last month
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      return {
        prevDateFrom: lastMonthStart,
        prevDateTo: lastMonthEnd,
      };
    }

    // Calculate the same duration for the previous period
    const duration = dateTo.getTime() - dateFrom.getTime();
    const prevEnd = new Date(dateFrom.getTime() - 1); // Day before current start
    const prevStart = new Date(prevEnd.getTime() - duration);
    
    return {
      prevDateFrom: prevStart,
      prevDateTo: prevEnd,
    };
  }, [dateFrom, dateTo]);

  // Fetch current period transactions
  const { data: transactions, isLoading } = useTransactions({ dateFrom, dateTo });
  
  // Fetch previous period transactions for comparison
  const { data: prevTransactions, isLoading: isPrevLoading } = useTransactions({ 
    dateFrom: prevDateFrom, 
    dateTo: prevDateTo 
  });

  const categoryStats = useMemo(() => {
    if (!transactions) return [];

    const stats = Object.keys(CATEGORY_CONFIG).map((category) => {
      const cat = category as TransactionCategory;
      const categoryTransactions = transactions.filter((t) => t.category === cat);
      const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      const paidAmount = categoryTransactions
        .filter((t) => t.is_paid)
        .reduce((sum, t) => sum + t.amount, 0);
      const count = categoryTransactions.length;

      // Previous period stats
      const prevCategoryTransactions = prevTransactions?.filter((t) => t.category === cat) || [];
      const prevTotalAmount = prevCategoryTransactions.reduce((sum, t) => sum + t.amount, 0);

      return {
        category: cat,
        ...CATEGORY_CONFIG[cat],
        totalAmount,
        paidAmount,
        pendingAmount: totalAmount - paidAmount,
        count,
        prevTotalAmount,
      };
    });

    return stats.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [transactions, prevTransactions]);

  const expenseCategories = categoryStats.filter((c) => c.category !== "tour_payment" && c.totalAmount > 0);
  const incomeCategory = categoryStats.find((c) => c.category === "tour_payment");

  const totalExpenses = expenseCategories.reduce((sum, c) => sum + c.totalAmount, 0);
  const prevTotalExpenses = expenseCategories.reduce((sum, c) => sum + c.prevTotalAmount, 0);
  const totalPendingExpenses = expenseCategories.reduce((sum, c) => sum + c.pendingAmount, 0);
  const maxExpense = Math.max(...expenseCategories.map((c) => c.totalAmount), 1);

  // Previous period income
  const prevIncomeCategory = useMemo(() => {
    if (!prevTransactions) return { totalAmount: 0, pendingAmount: 0 };
    const txs = prevTransactions.filter((t) => t.category === "tour_payment");
    const total = txs.reduce((sum, t) => sum + t.amount, 0);
    const paid = txs.filter((t) => t.is_paid).reduce((sum, t) => sum + t.amount, 0);
    return { totalAmount: total, pendingAmount: total - paid };
  }, [prevTransactions]);

  // Prepare chart data
  const chartData = expenseCategories.map((cat) => ({
    name: cat.label,
    value: cat.totalAmount,
    color: cat.chartColor,
  }));

  // Calculate profit margin
  const currentProfit = (incomeCategory?.totalAmount || 0) - totalExpenses;
  const prevProfit = (prevIncomeCategory.totalAmount || 0) - prevTotalExpenses;
  const profitMargin = incomeCategory && incomeCategory.totalAmount > 0
    ? ((currentProfit) / incomeCategory.totalAmount * 100).toFixed(1)
    : 0;

  // Top pending confirmations
  const pendingConfirmations = useMemo(() => {
    if (!transactions) return [];

    const grouped = transactions
      .filter((t) => t.type === "income" && !t.is_paid && t.confirmation)
      .reduce((acc, t) => {
        const code = t.confirmation?.confirmation_code || "General";
        if (!acc[code]) {
          acc[code] = { code, client: t.confirmation?.main_client_name, amount: 0 };
        }
        acc[code].amount += t.amount;
        return acc;
      }, {} as Record<string, { code: string; client: string | null | undefined; amount: number }>);

    return Object.values(grouped)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  if (isLoading || isPrevLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <ArrowDownRight className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-emerald-700/70 dark:text-emerald-400/70">Total Income</p>
                  <ChangeIndicator 
                    current={incomeCategory?.totalAmount || 0} 
                    previous={prevIncomeCategory.totalAmount} 
                  />
                </div>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 truncate">
                  {formatAmount(incomeCategory?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <ArrowUpRight className="h-5 w-5 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-rose-700/70 dark:text-rose-400/70">Total Expenses</p>
                  <ChangeIndicator 
                    current={totalExpenses} 
                    previous={prevTotalExpenses}
                    invertColors 
                  />
                </div>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-400 truncate">
                  {formatAmount(totalExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-amber-700/70 dark:text-amber-400/70">Pending</p>
                  <ChangeIndicator 
                    current={(incomeCategory?.pendingAmount || 0) + totalPendingExpenses} 
                    previous={prevIncomeCategory.pendingAmount}
                    invertColors
                  />
                </div>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400 truncate">
                  {formatAmount((incomeCategory?.pendingAmount || 0) + totalPendingExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                {Number(profitMargin) >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-blue-700/70 dark:text-blue-400/70">Profit Margin</p>
                  <ChangeIndicator 
                    current={currentProfit} 
                    previous={prevProfit} 
                  />
                </div>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {profitMargin}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expense Donut Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Expense Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No expenses recorded
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative w-[180px] h-[180px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
                                <p className="text-sm font-medium">{payload[0].name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatAmount(payload[0].value as number)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold">{formatAmount(totalExpenses)}</p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2 min-w-0">
                  {expenseCategories.slice(0, 6).map((cat) => (
                    <div key={cat.category} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.chartColor }}
                      />
                      <span className="text-sm truncate flex-1">{cat.label}</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {((cat.totalAmount / totalExpenses) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expenseCategories.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No expenses recorded</p>
            ) : (
              expenseCategories.map((cat) => (
                <div key={cat.category} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.chartColor }}
                      />
                      <span className="text-sm font-medium">{cat.label}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {cat.count}
                      </Badge>
                      <ChangeIndicator 
                        current={cat.totalAmount} 
                        previous={cat.prevTotalAmount}
                        invertColors
                      />
                    </div>
                    <span className="text-sm font-semibold">{formatAmount(cat.totalAmount)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(cat.totalAmount / maxExpense) * 100}%`,
                        backgroundColor: cat.chartColor,
                      }}
                    />
                  </div>
                  {cat.pendingAmount > 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatAmount(cat.pendingAmount)} pending
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Confirmations */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Payments
              </CardTitle>
              {pendingConfirmations.length > 0 && (
                <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0">
                  {pendingConfirmations.length} pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pendingConfirmations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium">All payments received!</p>
                <p className="text-xs text-muted-foreground">No pending confirmations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingConfirmations.map((c, index) => (
                  <div
                    key={c.code}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium">{c.code}</p>
                        <p className="text-xs text-muted-foreground">{c.client || "No client name"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{formatAmount(c.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Transaction Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Total Transactions</p>
                  <ChangeIndicator 
                    current={transactions?.length || 0} 
                    previous={prevTransactions?.length || 0} 
                  />
                </div>
                <p className="text-3xl font-bold">{transactions?.length || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Categories Active</p>
                <p className="text-3xl font-bold">
                  {categoryStats.filter((c) => c.count > 0).length}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight className="h-3 w-3 text-emerald-600" />
                  <p className="text-xs text-muted-foreground">Income</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {transactions?.filter((t) => t.type === "income").length || 0}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="h-3 w-3 text-rose-600" />
                  <p className="text-xs text-muted-foreground">Expenses</p>
                </div>
                <p className="text-2xl font-bold text-rose-600">
                  {transactions?.filter((t) => t.type === "expense").length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
