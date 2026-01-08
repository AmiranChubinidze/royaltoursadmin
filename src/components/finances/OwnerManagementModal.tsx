import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useOwners, useCreateOwner, useUpdateOwner, useDeleteOwner, Owner } from "@/hooks/useOwners";
import { toast } from "sonner";

interface OwnerManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OwnerManagementModal({ open, onOpenChange }: OwnerManagementModalProps) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
  });

  const { data: owners, isLoading } = useOwners();
  const createOwner = useCreateOwner();
  const updateOwner = useUpdateOwner();
  const deleteOwner = useDeleteOwner();

  const resetForm = () => {
    setFormData({ name: "", role: "" });
    setEditingOwner(null);
    setMode("list");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name,
      role: owner.role || "",
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
        await createOwner.mutateAsync({
          name: formData.name,
          role: formData.role || null,
        });
        toast.success("Owner created!");
      } else if (mode === "edit" && editingOwner) {
        await updateOwner.mutateAsync({
          id: editingOwner.id,
          name: formData.name,
          role: formData.role || null,
        });
        toast.success("Owner updated!");
      }
      resetForm();
    } catch (error) {
      toast.error("Failed to save owner");
    }
  };

  const handleDelete = async (owner: Owner) => {
    if (!confirm(`Are you sure you want to deactivate "${owner.name}"?`)) return;

    try {
      await deleteOwner.mutateAsync(owner.id);
      toast.success("Owner deactivated");
    } catch (error) {
      toast.error("Failed to deactivate owner");
    }
  };

  const isPending = createOwner.isPending || updateOwner.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "list" && "Manage Owners"}
            {mode === "create" && "New Owner"}
            {mode === "edit" && "Edit Owner"}
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
              Add New Owner
            </Button>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : owners && owners.length > 0 ? (
                owners.map((owner) => (
                  <div
                    key={owner.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{owner.name}</p>
                      {owner.role && (
                        <p className="text-xs text-muted-foreground">{owner.role}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(owner)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(owner)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No owners yet
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
                  placeholder="e.g., Rezi, Mom, Nato"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Role (optional)</Label>
                <Input
                  placeholder="e.g., Manager, Driver, Guide"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
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
