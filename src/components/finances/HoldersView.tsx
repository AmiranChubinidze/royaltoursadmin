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

      {/* Summary Header - Compact Design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border border-border/60 rounded-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
            <h3 className="font-medium text-sm text-foreground">Total Holdings</h3>
          </div>

          {/* Currency Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* USD Card */}
            <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-3">
              <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest text-primary/40">USD</div>
              
              <div className="mb-2">
                <span className={`text-xl font-bold tabular-nums tracking-tight ${
                  totals.USD.balance < 0 ? "text-destructive" : "text-foreground"
                }`}>
                  {totals.USD.balance < 0 && "−"}${Math.abs(Math.round(totals.USD.balance)).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {totals.USD.pendingIn > 0 && (
                  <div className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-2.5 w-2.5" />
                    +${Math.round(totals.USD.pendingIn).toLocaleString()}
                  </div>
                )}
                {totals.USD.pendingOut > 0 && (
                  <div className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                    <TrendingDown className="h-2.5 w-2.5" />
                    −${Math.round(totals.USD.pendingOut).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* GEL Card */}
            <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-3">
              <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest text-primary/40">GEL</div>
              
              <div className="mb-2">
                <span className={`text-xl font-bold tabular-nums tracking-tight ${
                  totals.GEL.balance < 0 ? "text-destructive" : "text-foreground"
                }`}>
                  {totals.GEL.balance < 0 && "−"}₾{Math.abs(Math.round(totals.GEL.balance)).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {totals.GEL.pendingIn > 0 && (
                  <div className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-2.5 w-2.5" />
                    +₾{Math.round(totals.GEL.pendingIn).toLocaleString()}
                  </div>
                )}
                {totals.GEL.pendingOut > 0 && (
                  <div className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                    <TrendingDown className="h-2.5 w-2.5" />
                    −₾{Math.round(totals.GEL.pendingOut).toLocaleString()}
                  </div>
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
