import { useState } from "react";
import { Loader2, Wallet, AlertTriangle, ArrowRightLeft, Settings, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHoldersWithBalances, HolderWithBalance } from "@/hooks/useHolders";
import { HolderCard } from "./HolderCard";
import { QuickTransferModal } from "./QuickTransferModal";
import { HolderManagementModal } from "./HolderManagementModal";
import { HolderTransactionsSheet } from "./HolderTransactionsSheet";
import { ExchangeRateModal } from "./ExchangeRateModal";

export function HoldersView() {
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [holderModalOpen, setHolderModalOpen] = useState(false);
  const [exchangeRateModalOpen, setExchangeRateModalOpen] = useState(false);
  const [selectedHolder, setSelectedHolder] = useState<HolderWithBalance | null>(null);

  const { data: holders, isLoading, error } = useHoldersWithBalances();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-destructive">
        <AlertTriangle className="h-6 w-6 mb-2" />
        <p className="text-sm">Failed to load holders</p>
      </div>
    );
  }

  if (!holders || holders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Wallet className="h-8 w-8 mb-2" />
        <p className="text-sm">No holders configured</p>
        <p className="text-xs mt-1">Add holders to track where your money is</p>
      </div>
    );
  }

  // Calculate totals for both currencies
  const totals = holders.reduce(
    (acc, holder) => {
      acc.USD.balance += holder.balanceUSD;
      acc.USD.pendingIn += holder.pendingInUSD;
      acc.USD.pendingOut += holder.pendingOutUSD;
      acc.GEL.balance += holder.balanceGEL;
      acc.GEL.pendingIn += holder.pendingInGEL;
      acc.GEL.pendingOut += holder.pendingOutGEL;
      return acc;
    },
    {
      USD: { balance: 0, pendingIn: 0, pendingOut: 0 },
      GEL: { balance: 0, pendingIn: 0, pendingOut: 0 },
    }
  );

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setTransferModalOpen(true)} className="gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Quick Transfer
        </Button>
        <Button variant="outline" onClick={() => setHolderModalOpen(true)} className="gap-2">
          <Settings className="h-4 w-4" />
          Manage People
        </Button>
        <Button variant="outline" onClick={() => setExchangeRateModalOpen(true)} className="gap-2">
          <DollarSign className="h-4 w-4" />
          Exchange Rate
        </Button>
      </div>

      {/* Summary Header - Premium Design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border border-border/60 rounded-2xl">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/3 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Total Holdings</h3>
              <p className="text-xs text-muted-foreground">Combined balance across all accounts</p>
            </div>
          </div>

          {/* Currency Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* USD Card */}
            <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-5 overflow-hidden">
              <div className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest text-primary/40">USD</div>
              
              <div className="mb-4">
                <span className={`text-3xl font-bold tabular-nums tracking-tight ${
                  totals.USD.balance < 0 ? "text-destructive" : "text-foreground"
                }`}>
                  {totals.USD.balance < 0 && "−"}
                  ${Math.abs(Math.round(totals.USD.balance)).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {totals.USD.pendingIn > 0 && (
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <TrendingUp className="h-3 w-3" />
                    +${Math.round(totals.USD.pendingIn).toLocaleString()}
                  </div>
                )}
                {totals.USD.pendingOut > 0 && (
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-lg">
                    <TrendingDown className="h-3 w-3" />
                    −${Math.round(totals.USD.pendingOut).toLocaleString()}
                  </div>
                )}
                {totals.USD.pendingIn === 0 && totals.USD.pendingOut === 0 && (
                  <span className="text-xs text-muted-foreground/50">No pending</span>
                )}
              </div>
            </div>

            {/* GEL Card */}
            <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-5 overflow-hidden">
              <div className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest text-primary/40">GEL</div>
              
              <div className="mb-4">
                <span className={`text-3xl font-bold tabular-nums tracking-tight ${
                  totals.GEL.balance < 0 ? "text-destructive" : "text-foreground"
                }`}>
                  {totals.GEL.balance < 0 && "−"}
                  ₾{Math.abs(Math.round(totals.GEL.balance)).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {totals.GEL.pendingIn > 0 && (
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <TrendingUp className="h-3 w-3" />
                    +₾{Math.round(totals.GEL.pendingIn).toLocaleString()}
                  </div>
                )}
                {totals.GEL.pendingOut > 0 && (
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-lg">
                    <TrendingDown className="h-3 w-3" />
                    −₾{Math.round(totals.GEL.pendingOut).toLocaleString()}
                  </div>
                )}
                {totals.GEL.pendingIn === 0 && totals.GEL.pendingOut === 0 && (
                  <span className="text-xs text-muted-foreground/50">No pending</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holder Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {holders.map((holder) => (
          <HolderCard
            key={holder.id}
            holder={holder}
            onClick={() => setSelectedHolder(holder)}
          />
        ))}
      </div>

      {/* Modals */}
      <QuickTransferModal open={transferModalOpen} onOpenChange={setTransferModalOpen} />
      <HolderManagementModal open={holderModalOpen} onOpenChange={setHolderModalOpen} />
      <ExchangeRateModal open={exchangeRateModalOpen} onOpenChange={setExchangeRateModalOpen} />
      <HolderTransactionsSheet
        holder={selectedHolder}
        open={!!selectedHolder}
        onOpenChange={(open) => !open && setSelectedHolder(null)}
      />
    </div>
  );
}
