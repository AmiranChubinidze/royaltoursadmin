import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SavedHotel {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  activities: string[];
  created_at: string;
}

// Hotels hooks
export function useSavedHotels() {
  return useQuery({
    queryKey: ["saved_hotels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_hotels")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as SavedHotel[];
    },
  });
}

export function useCreateSavedHotel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hotel: Omit<SavedHotel, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("saved_hotels")
        .insert(hotel)
        .select()
        .single();

      if (error) throw error;
      return data as SavedHotel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_hotels"] });
    },
  });
}

export function useDeleteSavedHotel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_hotels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_hotels"] });
    },
  });
}
