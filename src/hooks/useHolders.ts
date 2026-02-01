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
  user_id: string | null;
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
  user_id?: string | null;
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

      // Track unassigned pending (no responsible_holder_id)
      let unassignedPendingInUSD = 0;
      let unassignedPendingInGEL = 0;

      const holdersWithBalances: HolderWithBalance[] = holders.map((holder) => {
        const typedHolder: Holder = {
          ...holder,
          type: holder.type as HolderType,
          currency: holder.currency as HolderCurrency,
        };
        const balances = calculateHolderBalances(typedHolder, transactions);
        return {
          ...typedHolder,
          ...balances,
        };
      });

      // Calculate unassigned pending IN (no responsible_holder_id)
      transactions.forEach((tx) => {
        if (tx.kind === "in" && tx.status === "pending" && !tx.responsible_holder_id) {
          if (tx.currency === "USD") {
            unassignedPendingInUSD += Number(tx.amount);
          } else {
            unassignedPendingInGEL += Number(tx.amount);
          }
        }
      });

      // Add unassigned pending to each holder's totals for global display
      // Store in first holder or return separately
      return {
        holders: holdersWithBalances,
        unassignedPendingIn: {
          USD: unassignedPendingInUSD,
          GEL: unassignedPendingInGEL,
        },
      };
    },
  });
};

const calculateHolderBalances = (holder: Holder, transactions: any[]) => {
  let balanceUSD = 0;
  let balanceGEL = 0;
  let pendingInUSD = 0;
  let pendingInGEL = 0;
  let pendingOutUSD = 0;
  let pendingOutGEL = 0;
  let lastActivity: string | null = null;

  transactions.forEach((tx) => {
    const isConfirmed = tx.status === "confirmed";
    const isUSD = tx.currency === "USD";

    const isResponsible =
      tx.responsible_holder_id === holder.id ||
      (tx.from_holder_id === holder.id && !tx.responsible_holder_id);
    const isFromHolder = tx.from_holder_id === holder.id;
    const isToHolder = tx.to_holder_id === holder.id;

    if (tx.kind === "in" && isResponsible) {
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

    if (tx.kind === "out" && isResponsible) {
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

    if (tx.kind === "exchange" && isResponsible) {
      const rateMatch = tx.notes?.match(/Exchange rate: ([\d.]+)/);
      const rate = rateMatch ? parseFloat(rateMatch[1]) : null;
      const gelAmount = rate ? Number(tx.amount) * rate : 0;

      if (isConfirmed) {
        balanceUSD -= Number(tx.amount);
        balanceGEL += gelAmount;
      }
      if (!lastActivity || tx.date > lastActivity) {
        lastActivity = tx.date;
      }
    }
  });

  return {
    balanceUSD,
    balanceGEL,
    pendingInUSD,
    pendingInGEL,
    pendingOutUSD,
    pendingOutGEL,
    lastActivity,
    balance: balanceUSD + balanceGEL,
    pendingIn: pendingInUSD + pendingInGEL,
    pendingOut: pendingOutUSD + pendingOutGEL,
  };
};

export const useMyHolderBalance = (userId?: string) => {
  return useQuery({
    queryKey: ["holders", "with-balances", "user", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;

      const { data: holders, error: holdersError } = await supabase
        .from("holders")
        .select("*")
        .eq("is_active", true)
        .eq("user_id", userId);

      if (holdersError) throw holdersError;
      if (!holders || holders.length === 0) return null;

      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .neq("status", "void");

      if (txError) throw txError;

      const totals = holders.reduce(
        (acc, holder) => {
          const typedHolder: Holder = {
            ...holder,
            type: holder.type as HolderType,
            currency: holder.currency as HolderCurrency,
          };
          const balances = calculateHolderBalances(typedHolder, transactions);
          acc.balanceUSD += balances.balanceUSD;
          acc.balanceGEL += balances.balanceGEL;
          return acc;
        },
        { balanceUSD: 0, balanceGEL: 0 }
      );

      return totals;
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
          type: data.type || "cash",
          email: data.email,
          user_id: data.user_id ?? null,
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
