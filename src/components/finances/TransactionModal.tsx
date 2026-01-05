import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  { value: "sim", label: "SIM", type: "expense" },
  { value: "breakfast", label: "Breakfast", type: "expense" },
  { value: "fuel", label: "Fuel", type: "expense" },
  { value: "guide", label: "Guide", type: "expense" },
  { value: "other", label: "Other", type: "both" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" },
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
      <DialogContent className="sm:max-w-md p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">
            {transaction ? "Edit" : "Add"} Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Type Toggle */}
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant={formData.type === "income" ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setFormData({ ...formData, type: "income", category: "tour_payment" })}
            >
              Income
            </Button>
            <Button
              type="button"
              variant={formData.type === "expense" ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setFormData({ ...formData, type: "expense", category: "other" })}
            >
              Expense
            </Button>
          </div>

          {/* Row 1: Amount + Date */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full h-8 justify-start text-left text-xs font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {formData.date ? format(new Date(formData.date), "MMM d, yy") : "Pick"}
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
                    className="p-2 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 2: Category + Payment */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as TransactionCategory })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment</Label>
              <Select
                value={formData.payment_method || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    payment_method: value === "none" ? null : (value as PaymentMethod),
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Confirmation */}
          <div className="space-y-1">
            <Label className="text-xs">Confirmation</Label>
            <Select
              value={formData.confirmation_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, confirmation_id: value === "none" ? null : value })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">General</SelectItem>
                {confirmations?.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.confirmation_code} - {c.main_client_name?.split(" ")[0] || "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief note..."
              className="h-8 text-xs"
            />
          </div>

          {/* Status + Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_paid"
                checked={formData.is_paid}
                onCheckedChange={(checked) => setFormData({ ...formData, is_paid: !!checked })}
              />
              <Label htmlFor="is_paid" className="text-xs cursor-pointer">
                {formData.type === "income" ? "Received" : "Paid"}
              </Label>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs px-3">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={isLoading} className="h-8 text-xs px-4">
                {isLoading ? "..." : transaction ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
