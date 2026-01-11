import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useHolders, useCreateHolder, useUpdateHolder, useDeleteHolder, Holder } from "@/hooks/useHolders";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HolderManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HolderManagementModal({ open, onOpenChange }: HolderManagementModalProps) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingHolder, setEditingHolder] = useState<Holder | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const { data: holders, isLoading } = useHolders();
  const createHolder = useCreateHolder();
  const updateHolder = useUpdateHolder();
  const deleteHolder = useDeleteHolder();

  const resetForm = () => {
    setFormData({ name: "", email: "" });
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
      email: holder.email || "",
    });
    setMode("edit");
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const submitData = {
        name: formData.name,
        email: formData.email.trim() || null,
      };
      if (mode === "create") {
        await createHolder.mutateAsync(submitData);
        toast.success("Person added!");
      } else if (mode === "edit" && editingHolder) {
        await updateHolder.mutateAsync({ id: editingHolder.id, ...submitData });
        toast.success("Person updated!");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async (holder: Holder) => {
    if (!confirm(`Are you sure you want to remove "${holder.name}"?`)) return;

    try {
      await deleteHolder.mutateAsync(holder.id);
      toast.success("Person removed");
    } catch (error) {
      toast.error("Failed to remove");
    }
  };

  const isPending = createHolder.isPending || updateHolder.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "list" && "Manage People"}
            {mode === "create" && "Add Person"}
            {mode === "edit" && "Edit Person"}
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
              Add New Person
            </Button>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : holders && holders.length > 0 ? (
                holders.map((holder) => (
                  <div
                    key={holder.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{holder.name}</p>
                      {holder.email && (
                        <p className="text-xs text-muted-foreground">{holder.email}</p>
                      )}
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
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No people added yet
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
                  placeholder="e.g., Rezi, Giorgi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  placeholder="e.g., user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Link this person to a user account
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? "Add" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
