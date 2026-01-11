import { useState } from "react";
import { Loader2, Wallet, AlertTriangle, ArrowRightLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHoldersWithBalances, HolderWithBalance } from "@/hooks/useHolders";
import { HolderCard } from "./HolderCard";
import { QuickTransferModal } from "./QuickTransferModal";
import { HolderManagementModal } from "./HolderManagementModal";
import { HolderTransactionsSheet } from "./HolderTransactionsSheet";

export function HoldersView() {
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [holderModalOpen, setHolderModalOpen] = useState(false);
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
      </div>

      {/* Summary Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Total Holdings
        </h3>
        <div className="flex flex-wrap gap-6">
          {/* USD Total */}
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  totals.USD.balance < 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                {totals.USD.balance < 0 && "-"}
                ${Math.abs(totals.USD.balance).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
            <div className="flex gap-3 mt-1 text-xs">
              {totals.USD.pendingIn > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  +${totals.USD.pendingIn.toLocaleString()} pending
                </span>
              )}
              {totals.USD.pendingOut > 0 && (
                <span className="text-destructive">
                  -${totals.USD.pendingOut.toLocaleString()} pending
                </span>
              )}
            </div>
          </div>
          {/* GEL Total */}
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  totals.GEL.balance < 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                {totals.GEL.balance < 0 && "-"}
                ₾{Math.abs(totals.GEL.balance).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">GEL</span>
            </div>
            <div className="flex gap-3 mt-1 text-xs">
              {totals.GEL.pendingIn > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  +₾{totals.GEL.pendingIn.toLocaleString()} pending
                </span>
              )}
              {totals.GEL.pendingOut > 0 && (
                <span className="text-destructive">
                  -₾{totals.GEL.pendingOut.toLocaleString()} pending
                </span>
              )}
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
      <HolderTransactionsSheet
        holder={selectedHolder}
        open={!!selectedHolder}
        onOpenChange={(open) => !open && setSelectedHolder(null)}
      />
    </div>
  );
}
