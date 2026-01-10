import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Link2, ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import { LooseTransaction } from "./types";
import { Confirmation } from "@/types/confirmation";
import { useUpdateTransaction } from "@/hooks/useTransactions";
import { useToast } from "@/hooks/use-toast";

interface LooseTransactionsSectionProps {
  transactions: LooseTransaction[];
  confirmations: Confirmation[] | undefined;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GEL: "₾",
};

const formatTransactionAmount = (amount: number, currency?: string): string => {
  const symbol = CURRENCY_SYMBOLS[currency || "USD"] || "$";
  return `${symbol}${Math.round(amount).toLocaleString()}`;
};

export function LooseTransactionsSection({ 
  transactions, 
  confirmations 
}: LooseTransactionsSectionProps) {
  const { toast } = useToast();
  const updateTransaction = useUpdateTransaction();
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<LooseTransaction | null>(null);

  if (transactions.length === 0) return null;

  const handleAttach = (tx: LooseTransaction) => {
    setSelectedTx(tx);
    setAttachDialogOpen(true);
  };

  const handleAcceptSuggestion = async (tx: LooseTransaction) => {
    if (!tx.suggestedBooking) return;
    
    try {
      await updateTransaction.mutateAsync({
        id: tx.id,
        confirmation_id: tx.suggestedBooking.id,
      });
      toast({
        title: `Linked to ${tx.suggestedBooking.code}`,
        description: "Transaction attached to booking",
      });
    } catch (error) {
      toast({ title: "Error linking transaction", variant: "destructive" });
    }
  };

  const handleSelectBooking = async (confirmationId: string) => {
    if (!selectedTx) return;
    
    try {
      await updateTransaction.mutateAsync({
        id: selectedTx.id,
        confirmation_id: confirmationId,
      });
      const booking = confirmations?.find((c) => c.id === confirmationId);
      toast({
        title: `Linked to ${booking?.confirmation_code || "booking"}`,
        description: "Transaction attached",
      });
      setAttachDialogOpen(false);
      setSelectedTx(null);
    } catch (error) {
      toast({ title: "Error linking transaction", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-orange-100/50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-orange-600" />
            <h3 className="font-medium text-orange-800 dark:text-orange-400">
              Loose Transactions ({transactions.length})
            </h3>
          </div>
          <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
            These transactions aren't linked to any booking
          </p>
        </div>

        <div className="divide-y divide-orange-200 dark:divide-orange-800">
          {transactions.map((tx) => (
            <div key={tx.id} className="p-3 flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                tx.kind === "in" 
                  ? "bg-emerald-100 dark:bg-emerald-900/30" 
                  : "bg-red-100 dark:bg-red-900/30"
              )}>
                {tx.kind === "in" ? (
                  <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(tx.date), "MMM d")}
                  </span>
                  <span className={cn(
                    "font-medium",
                    tx.kind === "in" ? "text-emerald-600" : "text-red-600"
                  )}>
                    {tx.kind === "in" ? "+" : "-"}
                    {formatTransactionAmount(tx.amount, tx.currency)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {tx.description || tx.category}
                </p>
                
                {/* Suggestion */}
                {tx.suggestedBooking && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-orange-600">
                      Suggested: {tx.suggestedBooking.code} ({tx.suggestedBooking.confidence}%)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                      onClick={() => handleAcceptSuggestion(tx)}
                      disabled={updateTransaction.isPending}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8 text-xs"
                onClick={() => handleAttach(tx)}
              >
                <Link2 className="h-3 w-3 mr-1" />
                Attach
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Attach Dialog */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attach to Booking</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Search by code or client..." />
            <CommandList>
              <CommandEmpty>No bookings found.</CommandEmpty>
              <CommandGroup>
                {confirmations?.slice(0, 20).map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.confirmation_code} ${c.main_client_name}`}
                    onSelect={() => handleSelectBooking(c.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="font-mono text-sm">{c.confirmation_code}</span>
                      <span className="text-sm text-muted-foreground flex-1 truncate">
                        {c.main_client_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.arrival_date}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
