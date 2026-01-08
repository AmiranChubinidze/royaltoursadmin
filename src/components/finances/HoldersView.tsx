import { useState } from "react";
import { Loader2, Wallet, AlertTriangle, ArrowRightLeft, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHoldersWithBalances } from "@/hooks/useHolders";
import { HolderCard } from "./HolderCard";
import { QuickTransferModal } from "./QuickTransferModal";
import { HolderManagementModal } from "./HolderManagementModal";
import { OwnerManagementModal } from "./OwnerManagementModal";

interface HoldersViewProps {
  onHolderClick?: (holderId: string) => void;
}

export function HoldersView({ onHolderClick }: HoldersViewProps) {
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [holderModalOpen, setHolderModalOpen] = useState(false);
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);

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

  // Calculate totals by currency
  const totals = holders.reduce(
    (acc, holder) => {
      const currency = holder.currency;
      if (!acc[currency]) {
        acc[currency] = { balance: 0, pendingIn: 0, pendingOut: 0 };
      }
      acc[currency].balance += holder.balance;
      acc[currency].pendingIn += holder.pendingIn;
      acc[currency].pendingOut += holder.pendingOut;
      return acc;
    },
    {} as Record<string, { balance: number; pendingIn: number; pendingOut: number }>
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
          Manage Holders
        </Button>
        <Button variant="outline" onClick={() => setOwnerModalOpen(true)} className="gap-2">
          <Users className="h-4 w-4" />
          Manage Owners
        </Button>
      </div>

      {/* Summary Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Total Holdings
        </h3>
        <div className="flex flex-wrap gap-6">
          {Object.entries(totals).map(([currency, data]) => {
            const symbol = currency === "GEL" ? "₾" : "$";
            const isNegative = data.balance < 0;
            return (
              <div key={currency} className="flex-1 min-w-[120px]">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      isNegative ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {isNegative && "-"}
                    {symbol}
                    {Math.abs(data.balance).toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">{currency}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs">
                  {data.pendingIn > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{symbol}{data.pendingIn.toLocaleString()} pending
                    </span>
                  )}
                  {data.pendingOut > 0 && (
                    <span className="text-destructive">
                      -{symbol}{data.pendingOut.toLocaleString()} pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Holder Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {holders.map((holder) => (
          <HolderCard
            key={holder.id}
            holder={holder}
            onClick={() => onHolderClick?.(holder.id)}
          />
        ))}
      </div>

      {/* Modals */}
      <QuickTransferModal open={transferModalOpen} onOpenChange={setTransferModalOpen} />
      <HolderManagementModal open={holderModalOpen} onOpenChange={setHolderModalOpen} />
      <OwnerManagementModal open={ownerModalOpen} onOpenChange={setOwnerModalOpen} />
    </div>
  );
}
