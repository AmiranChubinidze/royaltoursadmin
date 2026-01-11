import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ExchangeRate {
  gel_to_usd: number;
  usd_to_gel: number;
}

const DEFAULT_RATE: ExchangeRate = {
  gel_to_usd: 0.36,
  usd_to_gel: 2.78,
};

export function useExchangeRate() {
  return useQuery({
    queryKey: ["exchange-rate"],
    queryFn: async (): Promise<ExchangeRate> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "exchange_rate")
        .single();

      if (error || !data) {
        console.error("Failed to fetch exchange rate:", error);
        return DEFAULT_RATE;
      }

      const value = data.value as unknown as ExchangeRate;
      return value;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useUpdateExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: ExchangeRate) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("app_settings")
        .update({
          value: JSON.parse(JSON.stringify(rate)),
          updated_at: new Date().toISOString(),
          updated_by: user.user?.id,
        })
        .eq("key", "exchange_rate");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rate"] });
    },
  });
}
