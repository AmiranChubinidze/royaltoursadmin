import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTransactions, useToggleTransactionStatus } from "@/hooks/useTransactions";
import { HolderWithBalance } from "@/hooks/useHolders";
import { cn } from "@/lib/utils";
import { StatusCheckbox } from "./StatusCheckbox";

interface HolderTransactionsSheetProps {
  holder: HolderWithBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HolderTransactionsSheet({ holder, open, onOpenChange }: HolderTransactionsSheetProps) {
  const { data: transactions } = useTransactions({ holderId: holder?.id });
  const toggleStatus = useToggleTransactionStatus();

  if (!holder) return null;

  const currencySymbol = holder.currency === "GEL" ? "₾" : "$";

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Filter transactions where this holder is responsible
  const holderTransactions = transactions?.filter(
    (t) => t.responsible_holder_id === holder.id && !t.is_auto_generated
  ) || [];

  const ins = holderTransactions.filter((t) => t.kind === "in");
  const outs = holderTransactions.filter((t) => t.kind === "out");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {holder.name}
            <Badge variant="outline" className="font-normal">
              {holder.currency}
            </Badge>
          </SheetTitle>
          <p className={cn(
            "text-2xl font-bold",
            holder.balance < 0 ? "text-destructive" : "text-foreground"
          )}>
            {holder.balance < 0 && "-"}{formatAmount(holder.balance)}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          {/* Money In */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
              <h3 className="font-medium text-sm">Money In</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {ins.length} transaction{ins.length !== 1 ? "s" : ""}
              </span>
            </div>
            {ins.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No incoming transactions</p>
            ) : (
              <div className="space-y-2">
                {ins.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                  >
                    <StatusCheckbox
                      checked={t.status === "confirmed"}
                      onChange={() => toggleStatus.mutate({ id: t.id, status: t.status === "confirmed" ? "pending" : "confirmed" })}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.description || t.category || "Income"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.date), "MMM d, yyyy")}
                        {t.responsible_holder?.name && (
                          <span className="ml-2 text-muted-foreground/70">
                            • {t.responsible_holder.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatAmount(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Money Out */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              <h3 className="font-medium text-sm">Money Out</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {outs.length} transaction{outs.length !== 1 ? "s" : ""}
              </span>
            </div>
            {outs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No outgoing transactions</p>
            ) : (
              <div className="space-y-2">
                {outs.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
                  >
                    <StatusCheckbox
                      checked={t.status === "confirmed"}
                      onChange={() => toggleStatus.mutate({ id: t.id, status: t.status === "confirmed" ? "pending" : "confirmed" })}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.description || t.category || "Expense"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.date), "MMM d, yyyy")}
                        {t.responsible_holder?.name && (
                          <span className="ml-2 text-muted-foreground/70">
                            • {t.responsible_holder.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-destructive">
                      -{formatAmount(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
