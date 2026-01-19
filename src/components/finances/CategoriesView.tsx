import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTransactions, TransactionCategory } from "@/hooks/useTransactions";
import { useCurrency } from "@/contexts/CurrencyContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Clock, Receipt, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

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

export function CategoriesView({ dateFrom, dateTo }: CategoriesViewProps) {
  const { data: transactions, isLoading } = useTransactions({ dateFrom, dateTo });
  const { formatAmount } = useCurrency();

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

      return {
        category: cat,
        ...CATEGORY_CONFIG[cat],
        totalAmount,
        paidAmount,
        pendingAmount: totalAmount - paidAmount,
        count,
      };
    });

    return stats.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [transactions]);

  const expenseCategories = categoryStats.filter((c) => c.category !== "tour_payment" && c.totalAmount > 0);
  const incomeCategory = categoryStats.find((c) => c.category === "tour_payment");

  const totalExpenses = expenseCategories.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalPendingExpenses = expenseCategories.reduce((sum, c) => sum + c.pendingAmount, 0);
  const maxExpense = Math.max(...expenseCategories.map((c) => c.totalAmount), 1);

  // Prepare chart data
  const chartData = expenseCategories.map((cat) => ({
    name: cat.label,
    value: cat.totalAmount,
    color: cat.chartColor,
  }));

  // Calculate profit margin
  const profitMargin = incomeCategory && incomeCategory.totalAmount > 0
    ? ((incomeCategory.totalAmount - totalExpenses) / incomeCategory.totalAmount * 100).toFixed(1)
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

  if (isLoading) {
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
                <p className="text-xs font-medium text-emerald-700/70 dark:text-emerald-400/70">Total Income</p>
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
                <p className="text-xs font-medium text-rose-700/70 dark:text-rose-400/70">Total Expenses</p>
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
                <p className="text-xs font-medium text-amber-700/70 dark:text-amber-400/70">Pending</p>
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
                <p className="text-xs font-medium text-blue-700/70 dark:text-blue-400/70">Profit Margin</p>
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
                <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
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
