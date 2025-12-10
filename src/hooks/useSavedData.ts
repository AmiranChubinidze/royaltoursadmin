import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SavedHotel {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface SavedClient {
  id: string;
  full_name: string;
  passport_number: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
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

// Clients hooks
export function useSavedClients() {
  return useQuery({
    queryKey: ["saved_clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_clients")
        .select("*")
        .order("full_name");

      if (error) throw error;
      return data as SavedClient[];
    },
  });
}

export function useCreateSavedClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Omit<SavedClient, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("saved_clients")
        .insert(client)
        .select()
        .single();

      if (error) throw error;
      return data as SavedClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_clients"] });
    },
  });
}

export function useDeleteSavedClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_clients"] });
    },
  });
}
