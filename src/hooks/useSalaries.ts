import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export type SalaryProfile = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  currency: "GEL" | "USD";
  isActive: boolean;
};

const monthKeyFromDate = (d: Date) => format(d, "yyyy-MM");

const dueDateIsoForMonth = (monthDate: Date, dueDay: number) => {
  const start = startOfMonth(monthDate);
  const last = endOfMonth(monthDate).getDate();
  const clampedDay = Math.min(Math.max(1, dueDay), last);
  return format(new Date(start.getFullYear(), start.getMonth(), clampedDay), "yyyy-MM-dd");
};

export const useSalaryProfiles = (opts?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["salary-profiles"],
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owners")
        .select("id,name,is_active,salary_amount,salary_due_day,salary_currency")
        .eq("is_active", true)
        .not("salary_amount", "is", null)
        .not("salary_due_day", "is", null)
        .order("name", { ascending: true });

      if (error) throw error;

      return (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        amount: Number(r.salary_amount || 0),
        dueDay: Number(r.salary_due_day || 1),
        currency: (r.salary_currency === "USD" ? "USD" : "GEL") as "GEL" | "USD",
        isActive: r.is_active,
      })) satisfies SalaryProfile[];
    },
  });
};

export const useUpsertSalaryProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { name: string; amount: number; dueDay: number; currency: "GEL" | "USD" }) => {
      const { data, error } = await supabase
        .from("owners")
        .upsert(
          {
            name: payload.name.trim(),
            is_active: true,
            salary_amount: payload.amount,
            salary_due_day: payload.dueDay,
            salary_currency: payload.currency,
          },
          { onConflict: "name" },
        )
        .select("id,name,is_active,salary_amount,salary_due_day,salary_currency")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-profiles"] });
      toast({ title: "Salary saved" });
    },
    onError: () => {
      toast({ title: "Error saving salary", variant: "destructive" });
    },
  });
};

export const useSalaryMonthTransactions = (monthDate: Date) => {
  const key = monthKeyFromDate(monthDate);
  const fromIso = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const toIso = format(endOfMonth(monthDate), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["salary-month-transactions", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id,owner_id,status,amount,date,description,currency")
        .eq("category", "salary")
        .eq("kind", "out")
        .neq("status", "void")
        .gte("date", fromIso)
        .lte("date", toIso)
        .order("date", { ascending: true });

      if (error) throw error;

      return (data || []).map((t) => ({
        id: t.id,
        ownerId: t.owner_id as string | null,
        status: t.status as "pending" | "confirmed" | "void",
        amount: Number(t.amount || 0),
        date: t.date as string,
        currency: (t.currency as string) || "GEL",
        description: t.description as string | null,
      }));
    },
  });
};

export const ensureCurrentMonthSalaryTransactions = async (args: {
  monthDate: Date;
  profiles: SalaryProfile[];
}) => {
  const monthKey = monthKeyFromDate(args.monthDate);
  const fromIso = format(startOfMonth(args.monthDate), "yyyy-MM-dd");
  const toIso = format(endOfMonth(args.monthDate), "yyyy-MM-dd");

  if (!args.profiles.length) return;

  const ownerIds = args.profiles.map((p) => p.id);

  const { data: existing, error } = await supabase
    .from("transactions")
    .select("id,owner_id,status,amount,date,currency")
    .eq("category", "salary")
    .eq("kind", "out")
    .neq("status", "void")
    .gte("date", fromIso)
    .lte("date", toIso)
    .in("owner_id", ownerIds);

  if (error) throw error;

  const byOwner = new Map<string, (typeof existing)[number]>();
  for (const t of existing || []) {
    if (t.owner_id) byOwner.set(t.owner_id as string, t);
  }

  const inserts: Database["public"]["Tables"]["transactions"]["Insert"][] = [];
  const updates: { id: string; patch: Record<string, unknown> }[] = [];

  for (const p of args.profiles) {
    const dueIso = dueDateIsoForMonth(args.monthDate, p.dueDay);
    const desc = `Salary - ${p.name} (${monthKey})`;
    const notes = `salary_owner_id=${p.id};salary_month=${monthKey}`;

    const existingTx = byOwner.get(p.id);
    if (!existingTx) {
      inserts.push({
        date: dueIso,
        kind: "out",
        type: "expense",
        category: "salary",
        description: desc,
        amount: p.amount,
        currency: p.currency,
        status: "pending",
        is_paid: false,
        is_auto_generated: true,
        notes,
        owner_id: p.id,
      });
      continue;
    }

    if (existingTx.status !== "confirmed") {
      const existingCurrency = existingTx.currency === "USD" ? "USD" : "GEL";
      const shouldUpdate =
        Number(existingTx.amount || 0) !== p.amount ||
        String(existingTx.date) !== dueIso ||
        existingCurrency !== p.currency;
      if (shouldUpdate) {
        updates.push({
          id: existingTx.id as string,
          patch: { amount: p.amount, date: dueIso, currency: p.currency, description: desc, notes },
        });
      }
    }
  }

  if (inserts.length) {
    const { error: insertError } = await supabase.from("transactions").insert(inserts);
    if (insertError) throw insertError;
  }

  for (const u of updates) {
    const { error: updateError } = await supabase
      .from("transactions")
      .update(u.patch)
      .eq("id", u.id);
    if (updateError) throw updateError;
  }
};
