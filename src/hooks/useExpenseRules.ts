import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExpenseRule {
  id: string;
  name: string;
  rate: number;
  currency: "GEL" | "USD";
  per_person: boolean;
  per_day: boolean;
  active: boolean;
  created_at: string;
}

export function useExpenseRules() {
  return useQuery({
    queryKey: ["expense_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_rules")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as ExpenseRule[];
    },
  });
}

export function useCreateExpenseRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Omit<ExpenseRule, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("expense_rules")
        .insert(rule)
        .select()
        .single();
      if (error) throw error;
      return data as ExpenseRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_rules"] });
    },
  });
}

export function useUpdateExpenseRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rule }: Partial<ExpenseRule> & { id: string }) => {
      const { data, error } = await supabase
        .from("expense_rules")
        .update(rule)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ExpenseRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_rules"] });
    },
  });
}

export function useDeleteExpenseRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expense_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_rules"] });
    },
  });
}
