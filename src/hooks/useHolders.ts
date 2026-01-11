import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HolderType = "person";
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
  balanceUSD: number;
  balanceGEL: number;
  pendingInUSD: number;
  pendingInGEL: number;
  pendingOutUSD: number;
  pendingOutGEL: number;
  lastActivity: string | null;
  // Legacy fields for compatibility
  balance: number;
  pendingIn: number;
  pendingOut: number;
}

export interface CreateHolderData {
  name: string;
  type?: HolderType;
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

      // Calculate balances for each holder - now tracking both currencies
      const holdersWithBalances: HolderWithBalance[] = holders.map((holder) => {
        let balanceUSD = 0;
        let balanceGEL = 0;
        let pendingInUSD = 0;
        let pendingInGEL = 0;
        let pendingOutUSD = 0;
        let pendingOutGEL = 0;
        let lastActivity: string | null = null;

        transactions.forEach((tx) => {
          const isConfirmed = tx.status === "confirmed";
          // The responsible holder is the one in from_holder_id field
          const isFromHolder = tx.from_holder_id === holder.id;
          const isToHolder = tx.to_holder_id === holder.id;
          const isUSD = tx.currency === "USD";
          
          // Handle IN transactions - from_holder receives the money
          if (tx.kind === "in" && isFromHolder) {
            if (isConfirmed) {
              if (isUSD) balanceUSD += Number(tx.amount);
              else balanceGEL += Number(tx.amount);
            } else if (tx.status === "pending") {
              if (isUSD) pendingInUSD += Number(tx.amount);
              else pendingInGEL += Number(tx.amount);
            }
            if (!lastActivity || tx.date > lastActivity) {
              lastActivity = tx.date;
            }
          }
          
          // Handle OUT transactions - from_holder spends the money
          if (tx.kind === "out" && isFromHolder) {
            if (isConfirmed) {
              if (isUSD) balanceUSD -= Number(tx.amount);
              else balanceGEL -= Number(tx.amount);
            } else if (tx.status === "pending") {
              if (isUSD) pendingOutUSD += Number(tx.amount);
              else pendingOutGEL += Number(tx.amount);
            }
            if (!lastActivity || tx.date > lastActivity) {
              lastActivity = tx.date;
            }
          }
          
          // Handle TRANSFER transactions
          if (tx.kind === "transfer") {
            if (isFromHolder && isConfirmed) {
              if (isUSD) balanceUSD -= Number(tx.amount);
              else balanceGEL -= Number(tx.amount);
              if (!lastActivity || tx.date > lastActivity) {
                lastActivity = tx.date;
              }
            }
            if (isToHolder && isConfirmed) {
              if (isUSD) balanceUSD += Number(tx.amount);
              else balanceGEL += Number(tx.amount);
              if (!lastActivity || tx.date > lastActivity) {
                lastActivity = tx.date;
              }
            }
          }
          
          // Handle EXCHANGE transactions - from_holder exchanges USD to GEL
          if (tx.kind === "exchange" && isFromHolder) {
            // Extract exchange rate from notes
            const rateMatch = tx.notes?.match(/Exchange rate: ([\d.]+)/);
            const rate = rateMatch ? parseFloat(rateMatch[1]) : null;
            const gelAmount = rate ? Number(tx.amount) * rate : 0;
            
            if (isConfirmed) {
              // Deduct USD
              balanceUSD -= Number(tx.amount);
              // Add GEL (computed from USD * rate)
              balanceGEL += gelAmount;
            }
            if (!lastActivity || tx.date > lastActivity) {
              lastActivity = tx.date;
            }
          }
        });

        return {
          ...holder,
          type: "person" as HolderType,
          currency: holder.currency as HolderCurrency,
          balanceUSD,
          balanceGEL,
          pendingInUSD,
          pendingInGEL,
          pendingOutUSD,
          pendingOutGEL,
          lastActivity,
          // Legacy fields for compatibility
          balance: balanceUSD + balanceGEL,
          pendingIn: pendingInUSD + pendingInGEL,
          pendingOut: pendingOutUSD + pendingOutGEL,
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
        .insert({
          name: data.name,
          type: data.type || "person",
          email: data.email,
          is_active: data.is_active ?? true,
        })
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
