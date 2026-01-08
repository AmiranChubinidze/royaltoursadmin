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
  TransactionKind,
  TransactionCategory,
  PaymentMethod,
  TransactionStatus,
  CreateTransactionData,
  useCreateTransaction,
  useUpdateTransaction,
} from "@/hooks/useTransactions";
import { useHolders } from "@/hooks/useHolders";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useToast } from "@/hooks/use-toast";
import { Currency } from "@/contexts/CurrencyContext";

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  defaultKind?: TransactionKind;
  defaultCategory?: TransactionCategory;
  defaultConfirmationId?: string;
}

const CATEGORIES: { value: string; label: string; kind: TransactionKind | "both" }[] = [
  { value: "tour_payment", label: "Tour Payment", kind: "in" },
  { value: "hotel", label: "Hotel", kind: "out" },
  { value: "driver", label: "Driver", kind: "out" },
  { value: "sim", label: "SIM", kind: "out" },
  { value: "breakfast", label: "Breakfast", kind: "out" },
  { value: "fuel", label: "Fuel", kind: "out" },
  { value: "guide", label: "Guide", kind: "out" },
  { value: "salary", label: "Salary", kind: "out" },
  { value: "transfer_internal", label: "Internal Transfer", kind: "transfer" },
  { value: "reimbursement", label: "Reimbursement", kind: "transfer" },
  { value: "deposit", label: "Bank Deposit", kind: "transfer" },
  { value: "other", label: "Other", kind: "both" },
  { value: "__custom__", label: "Custom...", kind: "both" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" },
  { value: "online", label: "Online" },
  { value: "personal", label: "Personal" },
];

export function TransactionModal({
  open,
  onOpenChange,
  transaction,
  defaultKind = "out",
  defaultCategory,
  defaultConfirmationId,
}: TransactionModalProps) {
  const { toast } = useToast();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const { data: confirmations } = useConfirmations();
  const { data: holders } = useHolders();

  const [inputCurrency, setInputCurrency] = useState<Currency>("USD");

  const [formData, setFormData] = useState<CreateTransactionData>({
    date: format(new Date(), "yyyy-MM-dd"),
    kind: defaultKind,
    status: "confirmed",
    category: defaultCategory || (defaultKind === "in" ? "tour_payment" : "other"),
    description: "",
    amount: 0,
    payment_method: null,
    confirmation_id: defaultConfirmationId || null,
    holder_id: null,
    from_holder_id: null,
    to_holder_id: null,
    responsible_holder_id: null,
    notes: "",
  });

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  useEffect(() => {
    if (transaction) {
      const knownCategories = CATEGORIES.map(c => c.value).filter(v => v !== "__custom__");
      const isKnown = knownCategories.includes(transaction.category);
      
      setFormData({
        date: transaction.date,
        kind: transaction.kind,
        status: transaction.status,
        category: isKnown ? transaction.category : "__custom__",
        description: transaction.description || "",
        amount: transaction.amount,
        payment_method: transaction.payment_method as PaymentMethod | null,
        confirmation_id: transaction.confirmation_id,
        holder_id: transaction.holder_id,
        from_holder_id: transaction.from_holder_id,
        to_holder_id: transaction.to_holder_id,
        responsible_holder_id: transaction.responsible_holder_id,
        notes: transaction.notes || "",
      });
      setIsCustomCategory(!isKnown);
      setCustomCategory(isKnown ? "" : transaction.category);
      setInputCurrency((transaction.currency as Currency) || "USD");
    } else {
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        kind: defaultKind,
        status: "confirmed",
        category: defaultCategory || (defaultKind === "in" ? "tour_payment" : "other"),
        description: "",
        amount: 0,
        payment_method: null,
        confirmation_id: defaultConfirmationId || null,
        holder_id: null,
        from_holder_id: null,
        to_holder_id: null,
        responsible_holder_id: null,
        notes: "",
      });
      setIsCustomCategory(false);
      setCustomCategory("");
      setInputCurrency("USD");
    }
  }, [transaction, defaultKind, defaultCategory, defaultConfirmationId, open]);

  const filteredCategories = CATEGORIES.filter(
    (c) => c.kind === "both" || c.kind === formData.kind
  );

  // Filter holders by payment method
  const filteredHolders = holders?.filter((h) => {
    if (!formData.payment_method) return true;
    const mapping: Record<string, string[]> = {
      cash: ["cash"],
      bank: ["bank"],
      online: ["bank"],
      card: ["card"],
      personal: ["cash"],
    };
    return mapping[formData.payment_method]?.includes(h.type) ?? true;
  });

  const handleSubmit = async () => {
    if (!formData.amount || formData.amount <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    // Validate transfer fields
    if (formData.kind === "transfer") {
      if (!formData.from_holder_id || !formData.to_holder_id) {
        toast({ title: "Please select both source and destination holders", variant: "destructive" });
        return;
      }
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : formData.category;
    
    if (isCustomCategory && !finalCategory) {
      toast({ title: "Please enter a custom category name", variant: "destructive" });
      return;
    }

    const submitData = { 
      ...formData, 
      category: finalCategory, 
      amount: formData.amount,
      currency: inputCurrency,
    };

    try {
      if (transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, ...submitData });
        toast({ title: "Transaction updated" });
      } else {
        await createTransaction.mutateAsync(submitData);
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
          {/* Kind Toggle */}
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant={formData.kind === "in" ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setFormData({ ...formData, kind: "in", category: "tour_payment" })}
            >
              Income
            </Button>
            <Button
              type="button"
              variant={formData.kind === "out" ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setFormData({ ...formData, kind: "out", category: "other" })}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={formData.kind === "transfer" ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setFormData({ ...formData, kind: "transfer", category: "transfer_internal" })}
            >
              Transfer
            </Button>
          </div>

          {/* Row 1: Amount + Currency + Date */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="h-8 text-sm flex-1"
                />
                <div className="flex rounded-md border border-input bg-background overflow-hidden h-8">
                  <button
                    type="button"
                    onClick={() => setInputCurrency("USD")}
                    className={cn(
                      "px-2 text-xs font-medium transition-colors",
                      inputCurrency === "USD"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    $
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputCurrency("GEL")}
                    className={cn(
                      "px-2 text-xs font-medium transition-colors",
                      inputCurrency === "GEL"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    ₾
                  </button>
                </div>
              </div>
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

          {/* Transfer: From/To Holders */}
          {formData.kind === "transfer" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Select
                  value={formData.from_holder_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, from_holder_id: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Select...</SelectItem>
                    {holders?.map((h) => (
                      <SelectItem key={h.id} value={h.id} className="text-xs">
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Select
                  value={formData.to_holder_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, to_holder_id: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Select...</SelectItem>
                    {holders?.map((h) => (
                      <SelectItem key={h.id} value={h.id} className="text-xs">
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            /* Row 2: Category + Payment */
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                {isCustomCategory ? (
                  <div className="flex gap-1">
                    <Input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Type category..."
                      className="h-8 text-xs flex-1"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => {
                        setIsCustomCategory(false);
                        setCustomCategory("");
                        setFormData({ ...formData, category: "other" });
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      if (value === "__custom__") {
                        setIsCustomCategory(true);
                        setFormData({ ...formData, category: "__custom__" });
                      } else {
                        setFormData({ ...formData, category: value });
                      }
                    }}
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
                )}
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
          )}

          {/* Holder + Responsible (for non-transfer) */}
          {formData.kind !== "transfer" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Holder</Label>
                <Select
                  value={formData.holder_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, holder_id: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    {filteredHolders?.map((h) => (
                      <SelectItem key={h.id} value={h.id} className="text-xs">
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Responsible</Label>
                <Select
                  value={formData.responsible_holder_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, responsible_holder_id: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    {holders?.map((h) => (
                      <SelectItem key={h.id} value={h.id} className="text-xs">
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
                id="status"
                checked={formData.status === "confirmed"}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "confirmed" : "pending" })}
              />
              <Label htmlFor="status" className="text-xs cursor-pointer">
                {formData.kind === "in" ? "Received" : formData.kind === "out" ? "Paid" : "Completed"}
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
