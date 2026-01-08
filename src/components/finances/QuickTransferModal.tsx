import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Building2, Wallet, Users, Loader2 } from "lucide-react";
import { useHolders, HolderType } from "@/hooks/useHolders";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { toast } from "sonner";

type TransferType = "deposit" | "give_cash" | "reimburse";

interface QuickTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TRANSFER_PRESETS = {
  deposit: {
    title: "Deposit Cash to Bank",
    description: "Move cash from a cash holder to a bank account",
    icon: Building2,
    fromTypes: ["cash"] as HolderType[],
    toTypes: ["bank"] as HolderType[],
  },
  give_cash: {
    title: "Give Cash to Staff",
    description: "Transfer cash to another person's wallet",
    icon: Users,
    fromTypes: ["cash"] as HolderType[],
    toTypes: ["cash"] as HolderType[],
  },
  reimburse: {
    title: "Reimburse Expenses",
    description: "Pay back personal expenses from bank",
    icon: Wallet,
    fromTypes: ["bank"] as HolderType[],
    toTypes: ["cash"] as HolderType[],
  },
};

export function QuickTransferModal({ open, onOpenChange }: QuickTransferModalProps) {
  const [transferType, setTransferType] = useState<TransferType | null>(null);
  const [fromHolderId, setFromHolderId] = useState("");
  const [toHolderId, setToHolderId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState<"GEL" | "USD">("GEL");

  const { data: holders } = useHolders();
  const createTransaction = useCreateTransaction();

  const resetForm = () => {
    setTransferType(null);
    setFromHolderId("");
    setToHolderId("");
    setAmount("");
    setNotes("");
    setCurrency("GEL");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!fromHolderId || !toHolderId || !amount || parseFloat(amount) <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (fromHolderId === toHolderId) {
      toast.error("Source and destination must be different");
      return;
    }

    try {
      await createTransaction.mutateAsync({
        kind: "transfer",
        status: "confirmed",
        amount: parseFloat(amount),
        currency,
        from_holder_id: fromHolderId,
        to_holder_id: toHolderId,
        category: "transfer",
        description: notes || TRANSFER_PRESETS[transferType!].title,
        date: new Date().toISOString().split("T")[0],
      });

      toast.success("Transfer completed!");
      handleClose();
    } catch (error) {
      toast.error("Failed to create transfer");
    }
  };

  const preset = transferType ? TRANSFER_PRESETS[transferType] : null;
  const fromHolders = holders?.filter((h) => preset?.fromTypes.includes(h.type as HolderType)) || [];
  const toHolders = holders?.filter((h) => preset?.toTypes.includes(h.type as HolderType) && h.id !== fromHolderId) || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Transfer</DialogTitle>
        </DialogHeader>

        {!transferType ? (
          <div className="space-y-3">
            {(Object.entries(TRANSFER_PRESETS) as [TransferType, typeof TRANSFER_PRESETS.deposit][]).map(
              ([type, preset]) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setTransferType(type)}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{preset.title}</h4>
                      <p className="text-xs text-muted-foreground">{preset.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              }
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button variant="ghost" size="sm" onClick={() => setTransferType(null)}>
                ← Back
              </Button>
              <span>{preset?.title}</span>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={fromHolderId} onValueChange={setFromHolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {fromHolders.map((holder) => (
                      <SelectItem key={holder.id} value={holder.id}>
                        {holder.name} ({holder.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label>To</Label>
                <Select value={toHolderId} onValueChange={setToHolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {toHolders.map((holder) => (
                      <SelectItem key={holder.id} value={holder.id}>
                        {holder.name} ({holder.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as "GEL" | "USD")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GEL">₾ GEL</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Add a note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createTransaction.isPending}
                className="flex-1"
              >
                {createTransaction.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Transfer"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
