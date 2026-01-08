import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTransactions, TransactionCategory } from "@/hooks/useTransactions";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CategoriesViewProps {
  dateFrom?: Date;
  dateTo?: Date;
}

const CATEGORY_CONFIG: Record<TransactionCategory, { label: string; color: string; bgColor: string }> = {
  tour_payment: { label: "Tour Payments", color: "text-emerald-600", bgColor: "bg-emerald-500" },
  hotel: { label: "Hotels", color: "text-blue-600", bgColor: "bg-blue-500" },
  driver: { label: "Driver", color: "text-purple-600", bgColor: "bg-purple-500" },
  sim: { label: "SIM Cards", color: "text-orange-600", bgColor: "bg-orange-500" },
  breakfast: { label: "Breakfast", color: "text-yellow-600", bgColor: "bg-yellow-500" },
  fuel: { label: "Fuel", color: "text-rose-600", bgColor: "bg-rose-500" },
  guide: { label: "Guide Fees", color: "text-cyan-600", bgColor: "bg-cyan-500" },
  other: { label: "Other", color: "text-gray-600", bgColor: "bg-gray-500" },
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

    // Sort by total amount descending
    return stats.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [transactions]);

  const expenseCategories = categoryStats.filter((c) => c.category !== "tour_payment" && c.totalAmount > 0);
  const incomeCategory = categoryStats.find((c) => c.category === "tour_payment");

  const totalExpenses = expenseCategories.reduce((sum, c) => sum + c.totalAmount, 0);
  const maxExpense = Math.max(...expenseCategories.map((c) => c.totalAmount), 1);

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
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Income Summary */}
      {incomeCategory && incomeCategory.totalAmount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tour Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatAmount(incomeCategory.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Received</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatAmount(incomeCategory.paidAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-amber-600">
                  {formatAmount(incomeCategory.pendingAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{incomeCategory.count} transactions</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {expenseCategories.length === 0 ? (
            <p className="text-muted-foreground text-sm">No expenses recorded</p>
          ) : (
            <>
              <div className="space-y-3">
                {expenseCategories.map((cat) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn("font-medium", cat.color)}>{cat.label}</span>
                      <span className="font-bold">{formatAmount(cat.totalAmount)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", cat.bgColor)}
                        style={{ width: `${(cat.totalAmount / maxExpense) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{cat.count} transactions</span>
                      {cat.pendingAmount > 0 && (
                        <span className="text-amber-600">
                          ({formatAmount(cat.pendingAmount)} unpaid)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Expenses</span>
                  <span className="font-bold text-red-600">{formatAmount(totalExpenses)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pending Confirmations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Biggest Pending Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingConfirmations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending payments</p>
          ) : (
            <div className="space-y-3">
              {pendingConfirmations.map((c) => (
                <div key={c.code} className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-medium">{c.code}</p>
                    <p className="text-xs text-muted-foreground">{c.client || "N/A"}</p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-500">
                    {formatAmount(c.amount)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions?.length || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Categories Used</p>
              <p className="text-2xl font-bold">
                {categoryStats.filter((c) => c.count > 0).length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-xs text-muted-foreground">Income Txns</p>
              <p className="text-2xl font-bold text-emerald-600">
                {transactions?.filter((t) => t.type === "income").length || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-xs text-muted-foreground">Expense Txns</p>
              <p className="text-2xl font-bold text-red-600">
                {transactions?.filter((t) => t.type === "expense").length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
