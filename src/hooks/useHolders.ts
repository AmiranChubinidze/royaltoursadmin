import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HolderType = "cash" | "bank" | "card";
export type HolderCurrency = "GEL" | "USD";

export interface Holder {
  id: string;
  name: string;
  type: HolderType;
  currency: HolderCurrency;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface HolderWithBalance extends Holder {
  balance: number;
  pendingIn: number;
  pendingOut: number;
  lastActivity: string | null;
}

export interface CreateHolderData {
  name: string;
  type: HolderType;
  currency?: HolderCurrency;
  email?: string | null;
  is_active?: boolean;
}

export interface UpdateHolderData extends Partial<CreateHolderData> {
  id: string;
}

export const useHolders = () => {
  return useQuery({
    queryKey: ["holders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holders")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Holder[];
    },
  });
};

export const useHoldersWithBalances = () => {
  return useQuery({
    queryKey: ["holders", "with-balances"],
    queryFn: async () => {
      // Fetch holders
      const { data: holders, error: holdersError } = await supabase
        .from("holders")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (holdersError) throw holdersError;

      // Fetch all non-void transactions
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .neq("status", "void");

      if (txError) throw txError;

      // Calculate balances for each holder
      const holdersWithBalances: HolderWithBalance[] = holders.map((holder) => {
        let balance = 0;
        let pendingIn = 0;
        let pendingOut = 0;
        let lastActivity: string | null = null;

        transactions.forEach((tx) => {
          const isConfirmed = tx.status === "confirmed";
          const isResponsible = tx.responsible_holder_id === holder.id;
          
          // Handle IN transactions - responsible holder receives the money
          if (tx.kind === "in" && isResponsible) {
            if (isConfirmed) {
              balance += Number(tx.amount);
            } else if (tx.status === "pending") {
              pendingIn += Number(tx.amount);
            }
            if (!lastActivity || tx.date > lastActivity) {
              lastActivity = tx.date;
            }
          }
          
          // Handle OUT transactions - responsible holder spends the money
          if (tx.kind === "out" && isResponsible) {
            if (isConfirmed) {
              balance -= Number(tx.amount);
            } else if (tx.status === "pending") {
              pendingOut += Number(tx.amount);
            }
            if (!lastActivity || tx.date > lastActivity) {
              lastActivity = tx.date;
            }
          }
          
          // Handle TRANSFER transactions
          if (tx.kind === "transfer") {
            if (tx.from_holder_id === holder.id && isConfirmed) {
              balance -= Number(tx.amount);
              if (!lastActivity || tx.date > lastActivity) {
                lastActivity = tx.date;
              }
            }
            if (tx.to_holder_id === holder.id && isConfirmed) {
              balance += Number(tx.amount);
              if (!lastActivity || tx.date > lastActivity) {
                lastActivity = tx.date;
              }
            }
          }
        });

        return {
          ...holder,
          type: holder.type as HolderType,
          currency: holder.currency as HolderCurrency,
          balance,
          pendingIn,
          pendingOut,
          lastActivity,
        };
      });

      return holdersWithBalances;
    },
  });
};

export const useCreateHolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateHolderData) => {
      const { data: result, error } = await supabase
        .from("holders")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holders"] });
    },
  });
};

export const useUpdateHolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateHolderData) => {
      const { data: result, error } = await supabase
        .from("holders")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holders"] });
    },
  });
};

export const useDeleteHolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { data, error, count } = await supabase
        .from("holders")
        .update({ is_active: false })
        .eq("id", id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: You don't have access to delete holders");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holders"] });
    },
  });
};
