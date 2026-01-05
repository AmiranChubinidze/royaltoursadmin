import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HotelBooking } from "@/components/CompactHotelBookingCard";

export interface BookingDraft {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  hotel_bookings: HotelBooking[];
  guest_info: {
    numAdults: number;
    numKids: number;
  };
  emails_sent: boolean;
  notes: string | null;
}

export function useBookingDrafts() {
  return useQuery({
    queryKey: ["booking-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_drafts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as BookingDraft[];
    },
  });
}

export function useCreateBookingDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: {
      hotel_bookings: HotelBooking[];
      guest_info: { numAdults: number; numKids: number };
      emails_sent?: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("booking_drafts")
        .insert([{
          hotel_bookings: draft.hotel_bookings as any,
          guest_info: draft.guest_info as any,
          emails_sent: draft.emails_sent ?? false,
          notes: draft.notes ?? null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-drafts"] });
    },
  });
}

export function useDeleteBookingDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("booking_drafts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-drafts"] });
    },
  });
}
