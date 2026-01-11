import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTransactions, useConfirmTransaction } from "@/hooks/useTransactions";
import { HolderWithBalance } from "@/hooks/useHolders";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ConfirmWithResponsiblePopover } from "./ConfirmWithResponsiblePopover";

interface HolderTransactionsSheetProps {
  holder: HolderWithBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HolderTransactionsSheet({ holder, open, onOpenChange }: HolderTransactionsSheetProps) {
  const { data: transactions } = useTransactions({ holderId: holder?.id });
  const confirmTransaction = useConfirmTransaction();

  if (!holder) return null;

  const { exchangeRate } = useCurrency();

  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$",
    GEL: "₾",
  };

  const formatAmount = (amount: number, currency?: string) => {
    const symbol = CURRENCY_SYMBOLS[currency || "USD"] || "$";
    return `${symbol}${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Filter transactions where this holder is responsible OR involved in transfers
  // Include ALL transactions (manual + auto-generated) to show complete breakdown
  const holderTransactions = transactions?.filter(
    (t) => 
      t.responsible_holder_id === holder.id || 
      t.from_holder_id === holder.id || 
      t.to_holder_id === holder.id
  ) || [];

  // Separate manual and auto-generated for each category
  const ins = holderTransactions.filter((t) => 
    t.kind === "in" || (t.kind === "transfer" && t.to_holder_id === holder.id)
  );
  const outs = holderTransactions.filter((t) => 
    t.kind === "out" || (t.kind === "transfer" && t.from_holder_id === holder.id)
  );
  const exchanges = holderTransactions.filter((t) => t.kind === "exchange");

  // Helper to render transaction item with auto-generated indicator
  const renderTransaction = (t: typeof holderTransactions[0], type: 'in' | 'out' | 'exchange') => {
    const isAuto = t.is_auto_generated;
    
    const bgClasses = {
      in: isAuto ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-emerald-500/5 border border-emerald-500/20",
      out: isAuto ? "bg-destructive/5 border border-destructive/10" : "bg-destructive/5 border border-destructive/20",
      exchange: isAuto ? "bg-blue-500/5 border border-blue-500/10" : "bg-blue-500/5 border border-blue-500/20",
    };

    if (type === 'exchange') {
      const rateMatch = t.notes?.match(/Exchange rate: ([\d.]+)/);
      const rate = rateMatch ? parseFloat(rateMatch[1]) : null;
      const gelAmount = rate ? t.amount * rate : null;
      
      return (
        <div
          key={t.id}
          className={cn("flex items-center gap-3 p-3 rounded-lg", bgClasses[type], isAuto && "opacity-70")}
        >
          <ConfirmWithResponsiblePopover
            checked={t.status === "confirmed"}
            currentResponsibleId={t.responsible_holder_id}
            onConfirm={(holderId) => confirmTransaction.mutate({ 
              id: t.id, 
              confirm: t.status !== "confirmed",
              responsibleHolderId: t.status !== "confirmed" ? holderId : undefined
            })}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate flex items-center gap-1.5">
              {isAuto && <Sparkles className="h-3 w-3 text-muted-foreground" />}
              {t.description || "Currency Exchange"}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(t.date), "MMM d, yyyy")}
              {rate && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  @ {rate}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              ₾{gelAmount ? Math.round(gelAmount).toLocaleString() : Math.round(t.amount).toLocaleString()}
            </span>
            <p className="text-xs text-muted-foreground">
              ${Math.round(t.amount).toLocaleString()}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        key={t.id}
        className={cn("flex items-center gap-3 p-3 rounded-lg", bgClasses[type], isAuto && "opacity-70")}
      >
        <ConfirmWithResponsiblePopover
          checked={t.status === "confirmed"}
          currentResponsibleId={t.responsible_holder_id}
          onConfirm={(holderId) => confirmTransaction.mutate({ 
            id: t.id, 
            confirm: t.status !== "confirmed",
            responsibleHolderId: t.status !== "confirmed" ? holderId : undefined
          })}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate flex items-center gap-1.5">
            {isAuto && <Sparkles className="h-3 w-3 text-muted-foreground" />}
            {t.description || t.category || (type === 'in' ? "Income" : "Expense")}
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
        <span className={cn(
          "text-sm font-semibold",
          type === 'in' ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
        )}>
          {type === 'in' ? '+' : '-'}{formatAmount(t.amount, t.currency)}
        </span>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {holder.name}
            <Badge variant="outline" className="font-normal">
              USD / GEL
            </Badge>
          </SheetTitle>

          {(() => {
            const totalInUSD = holder.balanceUSD + holder.balanceGEL * exchangeRate.gel_to_usd;
            const totalInGEL = holder.balanceGEL + holder.balanceUSD * exchangeRate.usd_to_gel;
            const isNegative = totalInUSD < 0;

            return (
              <>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    isNegative ? "text-destructive" : "text-foreground"
                  )}
                >
                  {isNegative && "-"}${Math.abs(totalInUSD).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  <span className="text-muted-foreground/50 mx-2">/</span>
                  {isNegative && "-"}₾{Math.abs(totalInGEL).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  USD {holder.balanceUSD < 0 && "-"}{formatAmount(holder.balanceUSD, "USD")} • GEL {holder.balanceGEL < 0 && "-"}{formatAmount(holder.balanceGEL, "GEL")}
                </p>
              </>
            );
          })()}
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
                {ins.map((t) => renderTransaction(t, 'in'))}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Money Out */}
          <div className="mb-6">
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
                {outs.map((t) => renderTransaction(t, 'out'))}
              </div>
            )}
          </div>

          {/* Exchanges */}
          {exchanges.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-sm">Exchanges</h3>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {exchanges.length} transaction{exchanges.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {exchanges.map((t) => renderTransaction(t, 'exchange'))}
                </div>
              </div>
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
