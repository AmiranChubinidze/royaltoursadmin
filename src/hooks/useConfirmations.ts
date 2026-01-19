import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Confirmation, ConfirmationPayload } from "@/types/confirmation";
import {
  generateConfirmationCode,
  getDateCode,
  calculateDaysAndNights,
  getMainClientName,
  formatDateToDDMMYYYY,
} from "@/lib/confirmationUtils";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

// Helper to convert database row to Confirmation type
function toConfirmation(row: any): Confirmation {
  return {
    ...row,
    raw_payload: row.raw_payload as unknown as ConfirmationPayload,
  };
}

// Helper to convert payload to Json for database
function toJson(payload: ConfirmationPayload): Json {
  return payload as unknown as Json;
}

export function useConfirmations(limit = 50) {
  return useQuery({
    queryKey: ["confirmations", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("confirmations")
        .select("*")
        .order("date_code", { ascending: false })
        .order("confirmation_code", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(toConfirmation);
    },
  });
}

export function useConfirmation(id: string | undefined) {
  return useQuery({
    queryKey: ["confirmation", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("confirmations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data ? toConfirmation(data) : null;
    },
    enabled: !!id,
  });
}

export function useCreateConfirmation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ConfirmationPayload & { tourSource?: string; price?: number | null }) => {
      const arrivalDate = payload.arrival.date;
      const departureDate = payload.departure.date;

      const confirmationCode = await generateConfirmationCode(arrivalDate);
      const dateCode = getDateCode(arrivalDate);
      const { days, nights } = calculateDaysAndNights(arrivalDate, departureDate);
      const mainClientName = getMainClientName(payload.clients);

      const { data, error } = await supabase
        .from("confirmations")
        .insert({
          confirmation_code: confirmationCode,
          date_code: dateCode,
          confirmation_date: formatDateToDDMMYYYY(new Date()),
          main_client_name: mainClientName,
          tour_source: payload.tourSource || null,
          arrival_date: arrivalDate,
          departure_date: departureDate,
          total_days: days,
          total_nights: nights,
          raw_payload: toJson(payload),
          price: payload.price || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-create "Tour IN" transaction if price is set
      if (payload.price && payload.price > 0) {
        await supabase.from("transactions").insert({
          date: arrivalDate,
          confirmation_id: data.id,
          kind: "in",
          type: "income",
          status: "pending",
          category: "tour_payment",
          description: `Tour payment - ${mainClientName || confirmationCode}`,
          amount: payload.price,
          currency: "USD",
          is_paid: false,
          is_auto_generated: true,
        });
      }

      return toConfirmation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Success",
        description: "Confirmation created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateConfirmation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
      status,
    }: {
      id: string;
      payload: ConfirmationPayload & { tourSource?: string; price?: number | null };
      status?: string;
    }) => {
      const arrivalDate = payload.arrival.date;
      const departureDate = payload.departure.date;

      // Regenerate code if arrival date changed or if completing a draft
      // For draft completion, generate a proper confirmation code (not DRAFT-xxx)
      let confirmationCode: string;
      
      if (status === "confirmed") {
        // When completing a draft, always generate a new proper confirmation code
        confirmationCode = await generateConfirmationCode(arrivalDate);
      } else {
        // Normal update - regenerate if needed
        confirmationCode = await generateConfirmationCode(arrivalDate, id);
      }
      
      const dateCode = getDateCode(arrivalDate);
      const { days, nights } = calculateDaysAndNights(arrivalDate, departureDate);
      const mainClientName = getMainClientName(payload.clients);

      const updateData: any = {
        confirmation_code: confirmationCode,
        date_code: dateCode,
        main_client_name: mainClientName,
        tour_source: payload.tourSource || null,
        arrival_date: arrivalDate,
        departure_date: departureDate,
        total_days: days,
        total_nights: nights,
        raw_payload: toJson(payload),
        price: payload.price ?? null,
      };

      // Add status if provided (for draft completion)
      if (status) {
        updateData.status = status;
      }

      const { data, error } = await supabase
        .from("confirmations")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // When completing a draft (status becomes "confirmed") with a price, create the Tour IN transaction
      if (status === "confirmed" && payload.price && payload.price > 0) {
        // Check if auto-generated transaction already exists
        const { data: existingTx } = await supabase
          .from("transactions")
          .select("id")
          .eq("confirmation_id", id)
          .eq("category", "tour_payment")
          .eq("is_auto_generated", true)
          .maybeSingle();

        if (!existingTx) {
          await supabase.from("transactions").insert({
            date: arrivalDate,
            confirmation_id: id,
            kind: "in",
            type: "income",
            status: "pending",
            category: "tour_payment",
            description: `Tour payment - ${mainClientName || confirmationCode}`,
            amount: payload.price,
            currency: "USD",
            is_paid: false,
            is_auto_generated: true,
          });
        }
      }

      return toConfirmation(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["confirmation", data.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDuplicateConfirmation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the original confirmation
      const { data: original, error: fetchError } = await supabase
        .from("confirmations")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const payload = original.raw_payload as unknown as ConfirmationPayload;
      const arrivalDate = payload.arrival.date;
      const departureDate = payload.departure.date;

      // Generate new code
      const confirmationCode = await generateConfirmationCode(arrivalDate);
      const dateCode = getDateCode(arrivalDate);
      const { days, nights } = calculateDaysAndNights(arrivalDate, departureDate);
      const mainClientName = getMainClientName(payload.clients);

      const { data, error } = await supabase
        .from("confirmations")
        .insert({
          confirmation_code: confirmationCode,
          date_code: dateCode,
          confirmation_date: formatDateToDDMMYYYY(new Date()),
          main_client_name: mainClientName,
          tour_source: original.tour_source,
          arrival_date: arrivalDate,
          departure_date: departureDate,
          total_days: days,
          total_nights: nights,
          raw_payload: original.raw_payload,
        })
        .select()
        .single();

      if (error) throw error;
      return toConfirmation(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      toast({
        title: "Success",
        description: "Confirmation duplicated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteConfirmation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("confirmations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      toast({
        title: "Success",
        description: "Confirmation deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateConfirmationNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("confirmations")
        .update({ notes })
        .eq("id", id);

      if (error) throw error;
      return { id, notes };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["confirmation", data.id] });
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
