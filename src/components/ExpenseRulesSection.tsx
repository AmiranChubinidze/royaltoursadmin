import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Zap, Plus, Pencil, Trash2, Receipt } from "lucide-react";
import {
  useExpenseRules,
  useCreateExpenseRule,
  useUpdateExpenseRule,
  useDeleteExpenseRule,
  ExpenseRule,
} from "@/hooks/useExpenseRules";

interface RuleFormData {
  name: string;
  rate: string;
  currency: "GEL" | "USD";
  per_person: boolean;
  per_day: boolean;
}

const EMPTY_FORM: RuleFormData = {
  name: "",
  rate: "",
  currency: "GEL",
  per_person: false,
  per_day: false,
};

const PREVIEW_ADULTS = 2;
const PREVIEW_DAYS = 3;

export function ExpenseRulesSection() {
  const { data: rules = [], isLoading } = useExpenseRules();
  const createRule = useCreateExpenseRule();
  const updateRule = useUpdateExpenseRule();
  const deleteRule = useDeleteExpenseRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ExpenseRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(EMPTY_FORM);

  const activeCount = rules.filter((r) => r.active).length;

  function openAdd() {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(rule: ExpenseRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      rate: String(rule.rate),
      currency: rule.currency,
      per_person: rule.per_person,
      per_day: rule.per_day,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRule(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    const rate = parseFloat(form.rate);
    if (!form.name.trim() || isNaN(rate) || rate <= 0) return;

    const payload = {
      name: form.name.trim(),
      rate,
      currency: form.currency,
      per_person: form.per_person,
      per_day: form.per_day,
      active: editingRule ? editingRule.active : true,
    };

    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, ...payload });
      } else {
        await createRule.mutateAsync(payload);
      }
      closeDialog();
    } catch (err) {
      console.error("Failed to save expense rule:", err);
    }
  }

  function handleToggleActive(rule: ExpenseRule) {
    updateRule.mutate({ id: rule.id, active: !rule.active });
  }

  const rate = parseFloat(form.rate);
  const previewValid = !isNaN(rate) && rate > 0;
  const previewTotal =
    rate * (form.per_person ? PREVIEW_ADULTS : 1) * (form.per_day ? PREVIEW_DAYS : 1);
  const currencySymbol = form.currency === "GEL" ? "₾" : "$";

  const isSaving = createRule.isPending || updateRule.isPending;

  return (
    <div className="mt-6">
      <Card className="border-border/60 bg-white/95 shadow-[0_12px_30px_rgba(15,76,92,0.08)] rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 pt-5 px-6 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#EAF7F8] p-2 rounded-xl border border-[#0F4C5C]/10">
                <Zap className="h-4 w-4 text-[#0F4C5C]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F4C5C]">Expense Rules</p>
                <p className="text-xs text-muted-foreground">Auto-charges applied per tour</p>
              </div>
            </div>
            <Button
              size="sm"
              className="rounded-full bg-[#0F4C5C] text-white hover:bg-[#0F4C5C]/90 gap-1.5"
              onClick={openAdd}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Rule
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Stat bar */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Active", value: activeCount },
              { label: "Total", value: rules.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8] px-4 py-3 shadow-[0_8px_20px_rgba(15,76,92,0.08)]"
              >
                <p className="text-xs uppercase tracking-[0.15em] text-[#0F4C5C]/60 font-medium">
                  {label}
                </p>
                <p className="text-xl font-semibold text-[#0F4C5C] mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Rule cards */}
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="py-14 text-center">
              <Zap className="h-10 w-10 text-[#0F4C5C]/15 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No expense rules yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Create rules like Insurance or Guide Fee to auto-charge on tours.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-[#0F4C5C]/30 text-[#0F4C5C] gap-1.5"
                onClick={openAdd}
              >
                <Plus className="h-3.5 w-3.5" />
                Add your first rule
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rules.map((rule) => {
                const sym = rule.currency === "GEL" ? "₾" : "$";
                const pills = [
                  rule.per_person ? "per person" : "flat fee",
                  ...(rule.per_day ? ["per day"] : []),
                ];
                return (
                  <div
                    key={rule.id}
                    className={`group rounded-2xl overflow-hidden border border-[#0F4C5C]/10 bg-white shadow-[0_10px_24px_rgba(15,76,92,0.08)] hover:shadow-[0_14px_34px_rgba(15,76,92,0.12)] hover:-translate-y-0.5 transition-all duration-200 p-4 ${!rule.active ? "opacity-50 grayscale" : ""}`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-[#EAF7F8] border border-[#0F4C5C]/10 p-2.5 rounded-xl">
                          <Zap className="h-3.5 w-3.5 text-[#0F4C5C]" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{rule.name}</span>
                      </div>
                      <Switch
                        checked={rule.active}
                        onCheckedChange={() => handleToggleActive(rule)}
                        className="mt-0.5"
                      />
                    </div>

                    {/* Rate */}
                    <p className="text-3xl font-bold font-mono text-[#0F4C5C] tracking-tight">
                      {rule.rate} {sym}
                    </p>

                    {/* Pills + actions row */}
                    <div className="flex items-end justify-between mt-2">
                      <div className="inline-flex flex-wrap gap-1.5">
                        {pills.map((pill) => (
                          <span
                            key={pill}
                            className="text-[10px] font-medium bg-[#EAF7F8] text-[#0F4C5C] border border-[#0F4C5C]/10 rounded-full px-2 py-0.5"
                          >
                            {pill}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-[#0F4C5C]"
                          onClick={() => openEdit(rule)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{rule.name}". Existing transactions
                                generated by this rule won't be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => deleteRule.mutate(rule.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Expense Rule"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Insurance"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Rate + currency */}
            <div className="space-y-1.5">
              <Label>Rate</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                  className="flex-1"
                />
                <div className="rounded-md border border-input overflow-hidden flex h-10">
                  {(["GEL", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, currency: c }))}
                      className={`px-3 text-sm font-medium transition-colors ${
                        form.currency === c
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {c === "GEL" ? "₾" : "$"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.per_person}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, per_person: !!v }))}
                />
                <span className="text-sm">Per person</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.per_day}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, per_day: !!v }))}
                />
                <span className="text-sm">Per day</span>
              </label>
            </div>

            {/* Live preview */}
            {previewValid && (
              <div className="bg-[#EAF7F8] border border-[#0F4C5C]/15 rounded-xl p-3 mt-1">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#0F4C5C]/50 mb-1.5">
                  Sample calculation ({PREVIEW_ADULTS} adults · {PREVIEW_DAYS} days)
                </p>
                <p className="text-base font-bold font-mono text-[#0F4C5C]">
                  {[
                    form.per_person ? `${PREVIEW_ADULTS} adults` : null,
                    form.per_day ? `${PREVIEW_DAYS} days` : null,
                    `${rate} ${currencySymbol}`,
                  ]
                    .filter(Boolean)
                    .join(" × ")}{" "}
                  = {previewTotal} {currencySymbol}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.name.trim() || !form.rate || parseFloat(form.rate) <= 0}
            >
              {isSaving ? "Saving..." : editingRule ? "Update" : "Add Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
