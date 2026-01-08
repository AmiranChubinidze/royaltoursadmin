import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TransactionKind = "in" | "out" | "transfer";
export type TransactionStatus = "pending" | "confirmed" | "void";
export type TransactionCategory = "tour_payment" | "hotel" | "driver" | "sim" | "breakfast" | "fuel" | "guide" | "transfer_internal" | "reimbursement" | "deposit" | "other" | string;
export type PaymentMethod = "cash" | "bank" | "card" | "online" | "personal";
export type TransactionCurrency = "USD" | "GEL";

// Legacy type for backward compatibility
export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  date: string;
  confirmation_id: string | null;
  type: TransactionType; // Legacy field
  kind: TransactionKind;
  status: TransactionStatus;
  category: TransactionCategory;
  description: string | null;
  amount: number;
  currency: TransactionCurrency;
  is_paid: boolean; // Legacy field
  payment_method: PaymentMethod | null;
  is_auto_generated: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // New holder-based fields
  holder_id: string | null;
  from_holder_id: string | null;
  to_holder_id: string | null;
  responsible_holder_id: string | null;
  counterparty: string | null;
  // Joined data
  confirmation?: {
    confirmation_code: string;
    main_client_name: string | null;
  } | null;
  holder?: {
    id: string;
    name: string;
    type: string;
  } | null;
  from_holder?: {
    id: string;
    name: string;
    type: string;
  } | null;
  to_holder?: {
    id: string;
    name: string;
    type: string;
  } | null;
  responsible_holder?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface CreateTransactionData {
  date: string;
  confirmation_id?: string | null;
  kind: TransactionKind;
  status?: TransactionStatus;
  category: TransactionCategory;
  description?: string | null;
  amount: number;
  currency?: TransactionCurrency;
  payment_method?: PaymentMethod | null;
  is_auto_generated?: boolean;
  notes?: string | null;
  holder_id?: string | null;
  from_holder_id?: string | null;
  to_holder_id?: string | null;
  responsible_holder_id?: string | null;
  counterparty?: string | null;
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {
  id: string;
}

// Map kind to legacy type for backward compatibility
const kindToType = (kind: TransactionKind): TransactionType => {
  if (kind === "in") return "income";
  return "expense";
};

export const useTransactions = (filters?: {
  dateFrom?: Date;
  dateTo?: Date;
  confirmationId?: string;
  kind?: TransactionKind;
  category?: TransactionCategory;
  status?: TransactionStatus;
  holderId?: string;
  ownerId?: string;
}) => {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          confirmation:confirmations(confirmation_code, main_client_name),
          holder:holders!transactions_holder_id_fkey(id, name, type),
          from_holder:holders!transactions_from_holder_id_fkey(id, name, type),
          to_holder:holders!transactions_to_holder_id_fkey(id, name, type),
          responsible_holder:holders!transactions_responsible_holder_id_fkey(id, name, type)
        `)
        .neq("status", "void")
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
      if (filters?.kind) {
        query = query.eq("kind", filters.kind);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.holderId) {
        query = query.or(`holder_id.eq.${filters.holderId},from_holder_id.eq.${filters.holderId},to_holder_id.eq.${filters.holderId},responsible_holder_id.eq.${filters.holderId}`);
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
        .select(`
          *,
          holder:holders!transactions_holder_id_fkey(id, name, type),
          responsible_holder:holders!transactions_responsible_holder_id_fkey(id, name, type)
        `)
        .eq("confirmation_id", confirmationId)
        .neq("status", "void")
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
          type: kindToType(data.kind),
          is_paid: data.status === "confirmed",
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holders"] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTransactionData) => {
      const updateData: Record<string, unknown> = { ...data };
      
      // Keep legacy fields in sync
      if (data.kind) {
        updateData.type = kindToType(data.kind);
      }
      if (data.status !== undefined) {
        updateData.is_paid = data.status === "confirmed";
      }

      const { data: result, error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holders"] });
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
      queryClient.invalidateQueries({ queryKey: ["holders"] });
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
            type: kindToType(t.kind),
            is_paid: t.status === "confirmed",
            created_by: user?.id || null,
          }))
        )
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holders"] });
    },
  });
};

export const useConfirmTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      confirm, 
      responsibleHolderId 
    }: { 
      id: string; 
      confirm: boolean;
      responsibleHolderId?: string | null;
    }) => {
      const updateData: Record<string, unknown> = { 
        status: confirm ? "confirmed" : "pending",
        is_paid: confirm,
      };
      
      if (responsibleHolderId !== undefined) {
        updateData.responsible_holder_id = responsibleHolderId;
      }

      const { error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holders"] });
    },
  });
};

export const useToggleTransactionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TransactionStatus }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ 
          status,
          is_paid: status === "confirmed" 
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holders"] });
    },
  });
};

// Legacy hook for backward compatibility
export const useToggleTransactionPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ 
          is_paid: isPaid,
          status: isPaid ? "confirmed" : "pending"
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holders"] });
    },
  });
};
