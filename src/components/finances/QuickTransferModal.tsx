import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2 } from "lucide-react";
import { useHolders } from "@/hooks/useHolders";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { toast } from "sonner";

interface QuickTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickTransferModal({ open, onOpenChange }: QuickTransferModalProps) {
  const [fromHolderId, setFromHolderId] = useState("");
  const [toHolderId, setToHolderId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState<"GEL" | "USD">("GEL");

  const { data: holders } = useHolders();
  const createTransaction = useCreateTransaction();

  const resetForm = () => {
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

    const fromHolder = holders?.find(h => h.id === fromHolderId);
    const toHolder = holders?.find(h => h.id === toHolderId);

    try {
      await createTransaction.mutateAsync({
        kind: "transfer",
        status: "confirmed",
        amount: parseFloat(amount),
        currency,
        from_holder_id: fromHolderId,
        to_holder_id: toHolderId,
        category: "transfer",
        description: notes || `Transfer from ${fromHolder?.name} to ${toHolder?.name}`,
        date: new Date().toISOString().split("T")[0],
      });

      toast.success("Transfer completed!");
      handleClose();
    } catch (error) {
      toast.error("Failed to create transfer");
    }
  };

  const availableToHolders = holders?.filter(h => h.id !== fromHolderId) || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Transfer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={fromHolderId} onValueChange={setFromHolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {holders?.map((holder) => (
                    <SelectItem key={holder.id} value={holder.id}>
                      {holder.name}
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
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {availableToHolders.map((holder) => (
                    <SelectItem key={holder.id} value={holder.id}>
                      {holder.name}
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
      </DialogContent>
    </Dialog>
  );
}
