import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTransactions, TransactionCategory } from "@/hooks/useTransactions";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useCurrency } from "@/contexts/CurrencyContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Clock, Receipt, Wallet, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { isWithinInterval } from "date-fns";

interface CategoriesViewProps {
  dateFrom?: Date;
  dateTo?: Date;
}

const CATEGORY_CONFIG: Record<TransactionCategory, { label: string; color: string; bgColor: string; chartColor: string }> = {
  tour_payment: { label: "Tour Payments", color: "text-emerald-600", bgColor: "bg-emerald-500", chartColor: "#10b981" },
  booking: { label: "Booking", color: "text-teal-600", bgColor: "bg-teal-500", chartColor: "#14b8a6" },
  hotel: { label: "Hotels", color: "text-blue-600", bgColor: "bg-blue-500", chartColor: "#3b82f6" },
  driver: { label: "Driver", color: "text-purple-600", bgColor: "bg-purple-500", chartColor: "#8b5cf6" },
  sim: { label: "SIM Cards", color: "text-orange-600", bgColor: "bg-orange-500", chartColor: "#f97316" },
  breakfast: { label: "Breakfast", color: "text-yellow-600", bgColor: "bg-yellow-500", chartColor: "#eab308" },
  fuel: { label: "Fuel", color: "text-rose-600", bgColor: "bg-rose-500", chartColor: "#f43f5e" },
  guide: { label: "Guide Fees", color: "text-cyan-600", bgColor: "bg-cyan-500", chartColor: "#06b6d4" },
  other: { label: "Other", color: "text-gray-600", bgColor: "bg-gray-500", chartColor: "#6b7280" },
};

const FALLBACK_COLORS = [
  { color: "text-indigo-600", bgColor: "bg-indigo-500", chartColor: "#6366f1" },
  { color: "text-amber-600", bgColor: "bg-amber-500", chartColor: "#f59e0b" },
  { color: "text-lime-600", bgColor: "bg-lime-500", chartColor: "#84cc16" },
  { color: "text-teal-600", bgColor: "bg-teal-500", chartColor: "#14b8a6" },
  { color: "text-sky-600", bgColor: "bg-sky-500", chartColor: "#0ea5e9" },
  { color: "text-fuchsia-600", bgColor: "bg-fuchsia-500", chartColor: "#d946ef" },
];

const normalizeLabel = (category: string) =>
  category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const colorForCategory = (category: string) => {
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash * 31 + category.charCodeAt(i)) % 997;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
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
  const { data: confirmations } = useConfirmations(500);

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

    const expenseTransactions = transactions.filter(
      (t) =>
        t.type === "expense" &&
        t.responsible_holder_id &&
        t.status === "confirmed" &&
        t.category !== "transfer_internal" &&
        t.category !== "currency_exchange"
    );

    const prevExpenseTransactions = (prevTransactions || []).filter(
      (t) =>
        t.type === "expense" &&
        t.responsible_holder_id &&
        t.status === "confirmed" &&
        t.category !== "transfer_internal" &&
        t.category !== "currency_exchange"
    );

    const categories = new Map<string, { label: string; color: string; bgColor: string; chartColor: string }>();
    Object.keys(CATEGORY_CONFIG).forEach((key) => {
      const config = CATEGORY_CONFIG[key as TransactionCategory];
      categories.set(key, config);
    });

    // Add dynamic categories from data
    expenseTransactions.forEach((t) => {
      if (!categories.has(t.category)) {
        const fallback = colorForCategory(t.category);
        categories.set(t.category, {
          label: normalizeLabel(t.category),
          ...fallback,
        });
      }
    });

    const stats = Array.from(categories.entries()).map(([category, config]) => {
      const categoryTransactions = expenseTransactions.filter((t) => t.category === category);
      
      // Separate by currency
      const usdTransactions = categoryTransactions.filter((t) => t.currency === "USD");
      const gelTransactions = categoryTransactions.filter((t) => t.currency === "GEL");
      
      const totalUSD = usdTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalGEL = gelTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      const paidUSD = usdTransactions.filter((t) => t.is_paid).reduce((sum, t) => sum + t.amount, 0);
      const paidGEL = gelTransactions.filter((t) => t.is_paid).reduce((sum, t) => sum + t.amount, 0);
      
      const count = categoryTransactions.length;

      // Previous period stats
      const prevCategoryTransactions = prevExpenseTransactions.filter((t) => t.category === category);
      const prevTotalUSD = prevCategoryTransactions.filter((t) => t.currency === "USD").reduce((sum, t) => sum + t.amount, 0);
      const prevTotalGEL = prevCategoryTransactions.filter((t) => t.currency === "GEL").reduce((sum, t) => sum + t.amount, 0);

      return {
        category: category as TransactionCategory,
        ...config,
        totalUSD,
        totalGEL,
        paidUSD,
        paidGEL,
        pendingUSD: totalUSD - paidUSD,
        pendingGEL: totalGEL - paidGEL,
        count,
        prevTotalUSD,
        prevTotalGEL,
      };
    });

    // Sort by total (USD + GEL combined for sorting)
    return stats.sort((a, b) => (b.totalUSD + b.totalGEL) - (a.totalUSD + a.totalGEL));
  }, [transactions, prevTransactions]);

  const expenseCategories = categoryStats.filter((c) => c.totalUSD > 0 || c.totalGEL > 0);
  const incomeCategory = useMemo(() => {
    if (!transactions) return undefined;
    const txs = transactions.filter((t) => t.category === "tour_payment" && t.type === "income" && t.status === "confirmed" && t.responsible_holder_id);
    const totalUSD = txs.filter((t) => t.currency === "USD").reduce((sum, t) => sum + t.amount, 0);
    const totalGEL = txs.filter((t) => t.currency === "GEL").reduce((sum, t) => sum + t.amount, 0);
    return { totalUSD, totalGEL };
  }, [transactions]);

  const totalExpensesUSD = expenseCategories.reduce((sum, c) => sum + c.totalUSD, 0);
  const totalExpensesGEL = expenseCategories.reduce((sum, c) => sum + c.totalGEL, 0);
  const prevTotalExpensesUSD = expenseCategories.reduce((sum, c) => sum + c.prevTotalUSD, 0);
  const prevTotalExpensesGEL = expenseCategories.reduce((sum, c) => sum + c.prevTotalGEL, 0);
  const totalPendingExpensesUSD = expenseCategories.reduce((sum, c) => sum + c.pendingUSD, 0);
  const totalPendingExpensesGEL = expenseCategories.reduce((sum, c) => sum + c.pendingGEL, 0);
  const maxExpense = Math.max(...expenseCategories.map((c) => c.totalUSD + c.totalGEL), 1);

  // Previous period income
  const prevIncomeCategory = useMemo(() => {
    if (!prevTransactions) return { totalUSD: 0, totalGEL: 0, pendingUSD: 0, pendingGEL: 0 };
    const txs = prevTransactions.filter((t) => t.category === "tour_payment" && t.type === "income" && t.status === "confirmed" && t.responsible_holder_id);
    const totalUSD = txs.filter((t) => t.currency === "USD").reduce((sum, t) => sum + t.amount, 0);
    const totalGEL = txs.filter((t) => t.currency === "GEL").reduce((sum, t) => sum + t.amount, 0);
    const paidUSD = txs.filter((t) => t.is_paid && t.currency === "USD").reduce((sum, t) => sum + t.amount, 0);
    const paidGEL = txs.filter((t) => t.is_paid && t.currency === "GEL").reduce((sum, t) => sum + t.amount, 0);
    return { totalUSD, totalGEL, pendingUSD: totalUSD - paidUSD, pendingGEL: totalGEL - paidGEL };
  }, [prevTransactions]);

  // Prepare chart data (using combined totals for pie chart visualization)
  const chartData = expenseCategories.map((cat) => ({
    name: cat.label,
    value: cat.totalUSD + cat.totalGEL, // Combined for chart proportions
    totalUSD: cat.totalUSD,
    totalGEL: cat.totalGEL,
    color: cat.chartColor,
  }));

  // Calculate profit margin (based on USD as primary currency)
  const currentProfitUSD = (incomeCategory?.totalUSD || 0) - totalExpensesUSD;
  const prevProfitUSD = (prevIncomeCategory.totalUSD || 0) - prevTotalExpensesUSD;
  const profitMargin = incomeCategory && incomeCategory.totalUSD > 0
    ? ((currentProfitUSD) / incomeCategory.totalUSD * 100).toFixed(1)
    : 0;

  const parseDateFlexible = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
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
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  // Top pending confirmations (based on confirmation status)
  const pendingConfirmations = useMemo(() => {
    if (!confirmations) return [];

    const confirmedIncomeByConfirmation = new Set(
      (transactions || [])
        .filter((t) => t.type === "income" && t.status === "confirmed" && t.confirmation_id)
        .map((t) => t.confirmation_id as string)
    );

    const pending = confirmations
      .filter((c) => {
        const price = Number(c.price) || 0;
        if (price <= 0) return false;
        if (c.client_paid) return false;
        if (confirmedIncomeByConfirmation.has(c.id)) return false;

        if (dateFrom || dateTo) {
          const d = parseDateFlexible(c.arrival_date) || parseDateFlexible(c.confirmation_date) || parseDateFlexible(c.created_at);
          if (!d) return false;
          if (dateFrom && dateTo) return isWithinInterval(d, { start: dateFrom, end: dateTo });
          if (dateFrom) return d >= dateFrom;
          if (dateTo) return d <= dateTo;
        }

        return true;
      })
      .map((c) => ({
        code: c.confirmation_code,
        client: c.main_client_name,
        amount: Number(c.price) || 0,
      }));

    return pending.sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [confirmations, transactions, dateFrom, dateTo]);

  if (isLoading || isPrevLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
                                <p className="text-sm font-medium">{payload[0].name}</p>
                                {data.totalUSD > 0 && (
                                  <p className="text-sm text-muted-foreground">${data.totalUSD.toLocaleString()}</p>
                                )}
                                {data.totalGEL > 0 && (
                                  <p className="text-sm text-muted-foreground">₾{data.totalGEL.toLocaleString()}</p>
                                )}
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
                    {totalExpensesUSD > 0 && (
                      <p className="text-base font-bold">${totalExpensesUSD.toLocaleString()}</p>
                    )}
                    {totalExpensesGEL > 0 && (
                      <p className="text-sm font-semibold text-muted-foreground">₾{totalExpensesGEL.toLocaleString()}</p>
                    )}
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
                        {(((cat.totalUSD + cat.totalGEL) / (totalExpensesUSD + totalExpensesGEL)) * 100).toFixed(0)}%
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
                        current={cat.totalUSD + cat.totalGEL} 
                        previous={cat.prevTotalUSD + cat.prevTotalGEL}
                        invertColors
                      />
                    </div>
                    <div className="text-right">
                      {cat.totalUSD > 0 && (
                        <span className="text-sm font-semibold">${cat.totalUSD.toLocaleString()}</span>
                      )}
                      {cat.totalUSD > 0 && cat.totalGEL > 0 && <span className="text-muted-foreground mx-1">·</span>}
                      {cat.totalGEL > 0 && (
                        <span className="text-sm font-semibold text-muted-foreground">₾{cat.totalGEL.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${((cat.totalUSD + cat.totalGEL) / maxExpense) * 100}%`,
                        backgroundColor: cat.chartColor,
                      }}
                    />
                  </div>
                  {(cat.pendingUSD > 0 || cat.pendingGEL > 0) && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cat.pendingUSD > 0 && `$${cat.pendingUSD.toLocaleString()}`}
                      {cat.pendingUSD > 0 && cat.pendingGEL > 0 && " · "}
                      {cat.pendingGEL > 0 && `₾${cat.pendingGEL.toLocaleString()}`}
                      {" pending"}
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
