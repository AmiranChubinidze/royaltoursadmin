import { useMemo, useState } from "react";
import { format, isPast, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CheckCircle2, Plus, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useConfirmTransaction } from "@/hooks/useTransactions";
import { useUserRole } from "@/hooks/useUserRole";
import { useViewAs } from "@/contexts/ViewAsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSalaryMonthTransactions,
  useSalaryProfiles,
  useUpsertSalaryProfile,
} from "@/hooks/useSalaries";

const monthKey = (d: Date) => format(d, "yyyy-MM");

const clampDueDay = (dueDay: number) => {
  if (!Number.isFinite(dueDay)) return 1;
  return Math.max(1, Math.min(31, Math.trunc(dueDay)));
};

const formatMoney = (amount: number, currency: "GEL" | "USD") => {
  const symbol = currency === "USD" ? "$" : "₾";
  return `${symbol}${Math.round(amount).toLocaleString()}`;
};

export function SalariesView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const monthDate = useMemo(() => new Date(), []);
  const mKey = monthKey(monthDate);

  const { role } = useUserRole();
  const { viewAsRole } = useViewAs();
  const effectiveRole = viewAsRole || role;
  const canManage = ["admin", "worker", "accountant"].includes(effectiveRole || "");

  const { data: profiles, isLoading: profilesLoading } = useSalaryProfiles();
  const { data: monthTx, isLoading: monthTxLoading } = useSalaryMonthTransactions(monthDate);
  const upsertSalary = useUpsertSalaryProfile();
  const confirmTransaction = useConfirmTransaction();

  const txByOwner = useMemo(() => {
    const map = new Map<string, (typeof monthTx)[number]>();
    for (const t of monthTx || []) {
      if (t.ownerId) map.set(t.ownerId, t);
    }
    return map;
  }, [monthTx]);

  const stats = useMemo(() => {
    const list = profiles || [];
    let dueCount = 0;
    let paidCount = 0;
    let totalExpectedGEL = 0;
    let totalExpectedUSD = 0;
    let totalRemainingGEL = 0;
    let totalRemainingUSD = 0;

    const monthStart = startOfMonth(monthDate);
    for (const p of list) {
      if (p.currency === "USD") totalExpectedUSD += p.amount;
      else totalExpectedGEL += p.amount;
      const t = txByOwner.get(p.id);
      if (t?.status === "confirmed") {
        paidCount += 1;
        continue;
      }
      // Use due day to compute due-ness (month tx might exist but is pending)
      const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      const day = Math.min(clampDueDay(p.dueDay), lastDay);
      const dueDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const isDue = isPast(dueDate);
      if (isDue) dueCount += 1;
      if (p.currency === "USD") totalRemainingUSD += p.amount;
      else totalRemainingGEL += p.amount;
    }

    return {
      dueCount,
      paidCount,
      totalExpectedGEL,
      totalExpectedUSD,
      totalRemainingGEL,
      totalRemainingUSD,
      totalCount: list.length,
    };
  }, [profiles, monthDate, txByOwner]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("15");
  const [currency, setCurrency] = useState<"GEL" | "USD">("GEL");

  const canSave =
    name.trim().length >= 2 &&
    Number(amount) > 0 &&
    Number.isFinite(Number(amount)) &&
    clampDueDay(Number(dueDay)) >= 1;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await upsertSalary.mutateAsync({
        name: name.trim(),
        amount: Number(amount),
        dueDay: clampDueDay(Number(dueDay)),
        currency,
      });
      setDialogOpen(false);
      setName("");
      setAmount("");
      setDueDay("15");
      setCurrency("GEL");
      // Ensuring will run via effect after query invalidation.
    } catch {
      // toast is handled in mutation onError
    }
  };

  const handleMarkPaid = async (txId: string) => {
    try {
      await confirmTransaction.mutateAsync({ id: txId, confirm: true });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["salary-month-transactions", mKey] });
      toast({ title: "Marked as paid" });
    } catch {
      toast({ title: "Error marking as paid", variant: "destructive" });
    }
  };

  const isLoading = profilesLoading || monthTxLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[#EAF7F8] border border-[#0F4C5C]/10 flex items-center justify-center shadow-[0_10px_24px_rgba(15,76,92,0.08)]">
              <Wallet className="h-4 w-4 text-[#0F4C5C]" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-[#0F4C5C] leading-tight">
                Salaries
              </h2>
              <p className="text-xs text-muted-foreground">
                Monthly payouts for {format(monthDate, "MMMM yyyy")}
              </p>
            </div>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className={cn(
                "h-9 rounded-xl bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 shadow-[0_10px_24px_rgba(15,76,92,0.16)]",
                !canManage && "pointer-events-none opacity-50",
              )}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Salary
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>Add Monthly Salary</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salary-name">Name</Label>
                <Input
                  id="salary-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nato"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="salary-amount">Amount</Label>
                  <Input
                    id="salary-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1200"
                  />
                  <p className="text-[11px] text-muted-foreground">Shows in Ledger as a Salary expense.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary-due">Due Day</Label>
                  <Input
                    id="salary-due"
                    inputMode="numeric"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    placeholder="15"
                  />
                  <p className="text-[11px] text-muted-foreground">1–31, rolls to month end if needed.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as "GEL" | "USD")}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GEL">GEL (₾)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!canSave || upsertSalary.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/80 shadow-[0_10px_24px_rgba(15,76,92,0.08)] p-4">
          <div className="text-xs text-muted-foreground">Due This Month</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-[22px] font-semibold tracking-tight text-[#0F4C5C]">
              {isLoading ? <Skeleton className="h-7 w-16" /> : stats.dueCount}
            </div>
            <div className="text-xs text-muted-foreground">people</div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/80 shadow-[0_10px_24px_rgba(15,76,92,0.08)] p-4">
          <div className="text-xs text-muted-foreground">Paid</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-[22px] font-semibold tracking-tight text-[#0F4C5C]">
              {isLoading ? <Skeleton className="h-7 w-16" /> : stats.paidCount}
            </div>
            <div className="text-xs text-muted-foreground">of {isLoading ? "…" : stats.totalCount}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/80 shadow-[0_10px_24px_rgba(15,76,92,0.08)] p-4">
          <div className="text-xs text-muted-foreground">Total (Expected)</div>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              <div className="text-[18px] font-semibold tracking-tight text-[#0F4C5C] leading-tight">
                {formatMoney(stats.totalExpectedGEL, "GEL")}
                <span className="ml-2 text-xs font-normal text-muted-foreground">GEL</span>
              </div>
              <div className="text-[18px] font-semibold tracking-tight text-[#0F4C5C] leading-tight">
                {formatMoney(stats.totalExpectedUSD, "USD")}
                <span className="ml-2 text-xs font-normal text-muted-foreground">USD</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#0F4C5C]/10 bg-white shadow-[0_10px_24px_rgba(15,76,92,0.08)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/50">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-[#0F4C5C]">This Month</div>
            <div className="text-xs text-muted-foreground">{format(monthDate, "MMMM yyyy")}</div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="w-[130px] text-right font-semibold">Amount</TableHead>
              <TableHead className="w-[140px] font-semibold">Due</TableHead>
              <TableHead className="w-[120px] text-center font-semibold">Status</TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : !profiles?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No salaries yet. Add one to start tracking monthly payments.
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((p) => {
                const t = txByOwner.get(p.id);
                const dueLabel = `Day ${p.dueDay}`;
                const paid = t?.status === "confirmed";
                const monthStart = startOfMonth(monthDate);
                const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
                const day = Math.min(clampDueDay(p.dueDay), lastDay);
                const fallbackDueDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
                const dueDate = t?.date ? new Date(t.date) : fallbackDueDate;
                const dueNow = !paid && !!t?.id && isPast(dueDate);
                return (
                  <TableRow key={p.id} className="hover:bg-[#EAF7F8]/40">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right font-semibold text-[#0F4C5C]">
                      {formatMoney(p.amount, p.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dueLabel}
                      {t?.date ? (
                        <span className="ml-2 text-xs text-muted-foreground/80">
                          ({format(new Date(t.date), "MMM d")})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center">
                      {paid ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Paid
                        </Badge>
                      ) : dueNow ? (
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                          Due
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                          Upcoming
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-9 rounded-xl border-[#0F4C5C]/15 hover:bg-[#EAF7F8]",
                          (!t?.id || paid || !canManage) && "pointer-events-none opacity-50",
                        )}
                        onClick={() => t?.id && handleMarkPaid(t.id)}
                      >
                        Mark Paid
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
