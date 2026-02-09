import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type SalaryProfileBase = {
  id: string;
  name: string;
  amount: number;
  currency: "GEL" | "USD";
  isActive: boolean;
};

export type SalaryProfile =
  | (SalaryProfileBase & { frequency: "monthly"; dueDay: number })
  | (SalaryProfileBase & { frequency: "weekly"; dueWeekday: number });

const monthKeyFromDate = (d: Date) => format(d, "yyyy-MM");
const weekKeyFromDate = (d: Date) => format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");

const clampMonthlyDueDay = (dueDay: number) => {
  if (!Number.isFinite(dueDay)) return 1;
  return Math.max(1, Math.min(31, Math.trunc(dueDay)));
};

const clampWeeklyDueWeekday = (dueWeekday: number) => {
  if (!Number.isFinite(dueWeekday)) return 1;
  return Math.max(1, Math.min(7, Math.trunc(dueWeekday)));
};

const dueDateIsoForMonth = (monthDate: Date, dueDay: number) => {
  const start = startOfMonth(monthDate);
  const last = endOfMonth(monthDate).getDate();
  const clampedDay = Math.min(clampMonthlyDueDay(dueDay), last);
  return format(new Date(start.getFullYear(), start.getMonth(), clampedDay), "yyyy-MM-dd");
};

const dueDateIsoForWeek = (weekDate: Date, dueWeekday: number) => {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const offset = clampWeeklyDueWeekday(dueWeekday) - 1; // 1=Mon .. 7=Sun
  return format(addDays(weekStart, offset), "yyyy-MM-dd");
};

export const useSalaryProfiles = (opts?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["salary-profiles"],
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owners")
        .select("id,name,is_active,salary_amount,salary_due_day,salary_due_weekday,salary_currency,salary_frequency")
        .eq("is_active", true)
        .not("salary_amount", "is", null)
        .or("and(salary_frequency.eq.monthly,salary_due_day.not.is.null),and(salary_frequency.eq.weekly,salary_due_weekday.not.is.null)")
        .order("name", { ascending: true });

      if (error) throw error;

      return (data || []).map((r) => {
        const base: SalaryProfileBase = {
          id: r.id,
          name: r.name,
          amount: Number(r.salary_amount || 0),
          currency: (r.salary_currency === "USD" ? "USD" : "GEL") as "GEL" | "USD",
          isActive: r.is_active,
        };

        const freq = r.salary_frequency === "weekly" ? "weekly" : "monthly";
        if (freq === "weekly") {
          return {
            ...base,
            frequency: "weekly" as const,
            dueWeekday: clampWeeklyDueWeekday(Number(r.salary_due_weekday || 1)),
          };
        }

        return {
          ...base,
          frequency: "monthly" as const,
          dueDay: clampMonthlyDueDay(Number(r.salary_due_day || 1)),
        };
      }) satisfies SalaryProfile[];
    },
  });
};

export const useUpsertSalaryProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      payload:
        | { name: string; amount: number; currency: "GEL" | "USD"; frequency: "monthly"; dueDay: number }
        | { name: string; amount: number; currency: "GEL" | "USD"; frequency: "weekly"; dueWeekday: number },
    ) => {
      const { data, error } = await supabase.rpc("upsert_salary_profile", {
        _name: payload.name.trim(),
        _amount: payload.amount,
        _frequency: payload.frequency,
        _due_day: payload.frequency === "monthly" ? clampMonthlyDueDay(payload.dueDay) : null,
        _due_weekday: payload.frequency === "weekly" ? clampWeeklyDueWeekday(payload.dueWeekday) : null,
        _currency: payload.currency,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-profiles"] });
      toast({ title: "Salary saved" });
    },
    onError: (err: any) => {
      const msg = typeof err?.message === "string" ? err.message : "Error saving salary";
      toast({ title: msg, variant: "destructive" });
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
  const monthlyProfiles = args.profiles.filter(
    (p): p is Extract<SalaryProfile, { frequency: "monthly" }> => p.frequency === "monthly",
  );
  if (!monthlyProfiles.length) return;

  const monthKey = monthKeyFromDate(args.monthDate);
  const fromIso = format(startOfMonth(args.monthDate), "yyyy-MM-dd");
  const toIso = format(endOfMonth(args.monthDate), "yyyy-MM-dd");

  const ownerIds = monthlyProfiles.map((p) => p.id);

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

  for (const p of monthlyProfiles) {
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

export const useSalaryWeekTransactions = (weekDate: Date) => {
  const key = weekKeyFromDate(weekDate);
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const fromIso = format(weekStart, "yyyy-MM-dd");
  const toIso = format(weekEnd, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["salary-week-transactions", key],
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

export const ensureCurrentWeekSalaryTransactions = async (args: {
  weekDate: Date;
  profiles: SalaryProfile[];
}) => {
  const weeklyProfiles = args.profiles.filter(
    (p): p is Extract<SalaryProfile, { frequency: "weekly" }> => p.frequency === "weekly",
  );
  if (!weeklyProfiles.length) return;

  const weekStart = startOfWeek(args.weekDate, { weekStartsOn: 1 });
  const weekKey = format(weekStart, "yyyy-MM-dd");
  const fromIso = format(weekStart, "yyyy-MM-dd");
  const toIso = format(endOfWeek(args.weekDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const ownerIds = weeklyProfiles.map((p) => p.id);

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

  for (const p of weeklyProfiles) {
    const dueIso = dueDateIsoForWeek(args.weekDate, p.dueWeekday);
    const desc = `Salary - ${p.name} (Week ${weekKey})`;
    const notes = `salary_owner_id=${p.id};salary_week_start=${weekKey}`;

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
