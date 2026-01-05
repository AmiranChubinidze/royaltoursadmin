import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TransactionType = "income" | "expense";
export type TransactionCategory = "tour_payment" | "hotel" | "driver" | "sim" | "breakfast" | "fuel" | "guide" | "other";
export type PaymentMethod = "cash" | "card" | "bank" | "other";

export interface Transaction {
  id: string;
  date: string;
  confirmation_id: string | null;
  type: TransactionType;
  category: TransactionCategory;
  description: string | null;
  amount: number;
  is_paid: boolean;
  payment_method: PaymentMethod | null;
  is_auto_generated: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  confirmation?: {
    confirmation_code: string;
    main_client_name: string | null;
  } | null;
}

export interface CreateTransactionData {
  date: string;
  confirmation_id?: string | null;
  type: TransactionType;
  category: TransactionCategory;
  description?: string | null;
  amount: number;
  is_paid?: boolean;
  payment_method?: PaymentMethod | null;
  is_auto_generated?: boolean;
  notes?: string | null;
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {
  id: string;
}

export const useTransactions = (filters?: {
  dateFrom?: Date;
  dateTo?: Date;
  confirmationId?: string;
  type?: TransactionType;
  category?: TransactionCategory;
  isPaid?: boolean;
}) => {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          confirmation:confirmations(confirmation_code, main_client_name)
        `)
        .order("date", { ascending: false });

      if (filters?.dateFrom) {
        query = query.gte("date", filters.dateFrom.toISOString().split("T")[0]);
      }
      if (filters?.dateTo) {
        query = query.lte("date", filters.dateTo.toISOString().split("T")[0]);
      }
      if (filters?.confirmationId) {
        query = query.eq("confirmation_id", filters.confirmationId);
      }
      if (filters?.type) {
        query = query.eq("type", filters.type);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.isPaid !== undefined) {
        query = query.eq("is_paid", filters.isPaid);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Transaction[];
    },
  });
};

export const useTransactionsByConfirmation = (confirmationId?: string) => {
  return useQuery({
    queryKey: ["transactions", "confirmation", confirmationId],
    queryFn: async () => {
      if (!confirmationId) return [];
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("confirmation_id", confirmationId)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!confirmationId,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      const { data: result, error } = await supabase
        .from("transactions")
        .insert({
          ...data,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTransactionData) => {
      const { data: result, error } = await supabase
        .from("transactions")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useBulkCreateTransactions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transactions: CreateTransactionData[]) => {
      const { data: result, error } = await supabase
        .from("transactions")
        .insert(
          transactions.map((t) => ({
            ...t,
            created_by: user?.id || null,
          }))
        )
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useToggleTransactionPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ is_paid: isPaid })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};
