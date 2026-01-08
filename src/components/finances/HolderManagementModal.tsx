import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Building2, CreditCard, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useHolders, useCreateHolder, useUpdateHolder, useDeleteHolder, Holder, HolderType, HolderCurrency } from "@/hooks/useHolders";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HolderManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HOLDER_TYPE_OPTIONS: { value: HolderType; label: string; icon: React.ElementType }[] = [
  { value: "cash", label: "Cash", icon: Wallet },
  { value: "bank", label: "Bank", icon: Building2 },
  { value: "card", label: "Card", icon: CreditCard },
];

export function HolderManagementModal({ open, onOpenChange }: HolderManagementModalProps) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingHolder, setEditingHolder] = useState<Holder | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "cash" as HolderType,
    currency: "GEL" as HolderCurrency,
  });

  const { data: holders, isLoading } = useHolders();
  const createHolder = useCreateHolder();
  const updateHolder = useUpdateHolder();
  const deleteHolder = useDeleteHolder();

  const resetForm = () => {
    setFormData({ name: "", type: "cash", currency: "GEL" });
    setEditingHolder(null);
    setMode("list");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleEdit = (holder: Holder) => {
    setEditingHolder(holder);
    setFormData({
      name: holder.name,
      type: holder.type,
      currency: holder.currency,
    });
    setMode("edit");
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      if (mode === "create") {
        await createHolder.mutateAsync(formData);
        toast.success("Holder created!");
      } else if (mode === "edit" && editingHolder) {
        await updateHolder.mutateAsync({ id: editingHolder.id, ...formData });
        toast.success("Holder updated!");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save holder");
    }
  };

  const handleDelete = async (holder: Holder) => {
    if (!confirm(`Are you sure you want to deactivate "${holder.name}"?`)) return;

    try {
      await deleteHolder.mutateAsync(holder.id);
      toast.success("Holder deactivated");
    } catch (error) {
      toast.error("Failed to deactivate holder");
    }
  };

  const isPending = createHolder.isPending || updateHolder.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "list" && "Manage Holders"}
            {mode === "create" && "New Holder"}
            {mode === "edit" && "Edit Holder"}
          </DialogTitle>
        </DialogHeader>

        {mode === "list" ? (
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setMode("create")}
            >
              <Plus className="h-4 w-4" />
              Add New Holder
            </Button>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : holders && holders.length > 0 ? (
                holders.map((holder) => {
                  const TypeIcon = HOLDER_TYPE_OPTIONS.find((t) => t.value === holder.type)?.icon || Wallet;
                  return (
                    <div
                      key={holder.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        holder.type === "cash" && "bg-emerald-500/10 text-emerald-600",
                        holder.type === "bank" && "bg-blue-500/10 text-blue-600",
                        holder.type === "card" && "bg-purple-500/10 text-purple-600"
                      )}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{holder.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {holder.type} • {holder.currency}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(holder)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(holder)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No holders yet
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={resetForm}>
              ← Back to list
            </Button>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., Rezi Cash, TBC Bank"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {HOLDER_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: value })}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                        formData.type === value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v as HolderCurrency })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GEL">₾ GEL (Georgian Lari)</SelectItem>
                    <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
