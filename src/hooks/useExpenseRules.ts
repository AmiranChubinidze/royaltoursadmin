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
  hotel_ids: string[];
  // Rules sharing the same non-empty group are selected/deselected together
  // on a confirmation (e.g. the two insurance rules).
  group: string | null;
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
    mutationFn: async (rule: Omit<ExpenseRule, "id" | "created_at" | "hotel_ids" | "group"> & { hotel_ids?: string[]; group?: string | null }) => {
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
    // Optimistic — flip the toggle/edit instantly, reconcile on settle.
    onMutate: async ({ id, ...rule }) => {
      await queryClient.cancelQueries({ queryKey: ["expense_rules"] });
      const previous = queryClient.getQueryData<ExpenseRule[]>(["expense_rules"]);
      queryClient.setQueryData<ExpenseRule[]>(["expense_rules"], (list) =>
        list?.map((r) => (r.id === id ? { ...r, ...rule } : r))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["expense_rules"], context.previous);
    },
    onSettled: () => {
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
