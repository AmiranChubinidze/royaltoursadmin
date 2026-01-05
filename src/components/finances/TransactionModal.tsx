import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import {
  Transaction,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
  CreateTransactionData,
  useCreateTransaction,
  useUpdateTransaction,
} from "@/hooks/useTransactions";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useToast } from "@/hooks/use-toast";

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  defaultType?: TransactionType;
  defaultCategory?: TransactionCategory;
  defaultConfirmationId?: string;
}

const CATEGORIES: { value: TransactionCategory; label: string; type: TransactionType | "both" }[] = [
  { value: "tour_payment", label: "Tour Payment", type: "income" },
  { value: "hotel", label: "Hotel", type: "expense" },
  { value: "driver", label: "Driver", type: "expense" },
  { value: "sim", label: "SIM Card", type: "expense" },
  { value: "breakfast", label: "Breakfast", type: "expense" },
  { value: "fuel", label: "Fuel", type: "expense" },
  { value: "guide", label: "Guide Fee", type: "expense" },
  { value: "other", label: "Other", type: "both" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

export function TransactionModal({
  open,
  onOpenChange,
  transaction,
  defaultType = "expense",
  defaultCategory,
  defaultConfirmationId,
}: TransactionModalProps) {
  const { toast } = useToast();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const { data: confirmations } = useConfirmations();

  const [formData, setFormData] = useState<CreateTransactionData>({
    date: format(new Date(), "yyyy-MM-dd"),
    type: defaultType,
    category: defaultCategory || (defaultType === "income" ? "tour_payment" : "other"),
    description: "",
    amount: 0,
    is_paid: false,
    payment_method: null,
    confirmation_id: defaultConfirmationId || null,
    notes: "",
  });

  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description || "",
        amount: transaction.amount,
        is_paid: transaction.is_paid,
        payment_method: transaction.payment_method,
        confirmation_id: transaction.confirmation_id,
        notes: transaction.notes || "",
      });
    } else {
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        type: defaultType,
        category: defaultCategory || (defaultType === "income" ? "tour_payment" : "other"),
        description: "",
        amount: 0,
        is_paid: false,
        payment_method: null,
        confirmation_id: defaultConfirmationId || null,
        notes: "",
      });
    }
  }, [transaction, defaultType, defaultCategory, defaultConfirmationId, open]);

  const filteredCategories = CATEGORIES.filter(
    (c) => c.type === "both" || c.type === formData.type
  );

  const handleSubmit = async () => {
    if (!formData.amount || formData.amount <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    try {
      if (transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, ...formData });
        toast({ title: "Transaction updated" });
      } else {
        await createTransaction.mutateAsync(formData);
        toast({ title: "Transaction created" });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error saving transaction", variant: "destructive" });
    }
  };

  const isLoading = createTransaction.isPending || updateTransaction.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Type Toggle */}
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.type === "income" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setFormData({ ...formData, type: "income", category: "tour_payment" })}
              >
                Income
              </Button>
              <Button
                type="button"
                variant={formData.type === "expense" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setFormData({ ...formData, type: "expense", category: "other" })}
              >
                Expense
              </Button>
            </div>
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label>Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(new Date(formData.date), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date ? new Date(formData.date) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setFormData({ ...formData, date: format(date, "yyyy-MM-dd") });
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Confirmation */}
          <div className="grid gap-2">
            <Label>Confirmation (Optional)</Label>
            <Select
              value={formData.confirmation_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, confirmation_id: value === "none" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select confirmation..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General (No confirmation)</SelectItem>
                {confirmations?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.confirmation_code} - {c.main_client_name || "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value as TransactionCategory })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="grid gap-2">
            <Label>Amount ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
              }
              placeholder="0.00"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label>Description</Label>
            <Input
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description..."
            />
          </div>

          {/* Payment Method */}
          <div className="grid gap-2">
            <Label>Payment Method</Label>
            <Select
              value={formData.payment_method || "none"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  payment_method: value === "none" ? null : (value as PaymentMethod),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between">
            <Label>
              {formData.type === "income" ? "Received" : "Paid"}
            </Label>
            <Switch
              checked={formData.is_paid}
              onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
            />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : transaction ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
