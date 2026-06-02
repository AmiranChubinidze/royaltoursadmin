import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Confirmation } from "@/types/confirmation";
import type { SavedHotel } from "@/hooks/useSavedData";

export interface ConfirmationHotel {
  hotelName: string;
  checkIn: string;
  checkOut: string;
  isOwned: boolean;
  hasEmail: boolean;
}

// Derive the (non-owned) hotels for a confirmation from its itinerary, falling
// back to the draft-flow hotelBookings. Consecutive itinerary days at the same
// hotel collapse into a single stay.
export function getConfirmationHotels(
  confirmation: Confirmation,
  savedHotels: SavedHotel[]
): ConfirmationHotel[] {
  const ownedSet = new Set(
    savedHotels.filter((h) => h.is_owned).map((h) => h.name.trim().toLowerCase())
  );
  const emailByName = new Map(
    savedHotels
      .filter((h) => h.email)
      .map((h) => [h.name.trim().toLowerCase(), h.email as string])
  );

  const decorate = (hotelName: string, checkIn: string, checkOut: string): ConfirmationHotel => {
    const key = hotelName.trim().toLowerCase();
    return {
      hotelName,
      checkIn,
      checkOut,
      isOwned: ownedSet.has(key),
      hasEmail: emailByName.has(key),
    };
  };

  const itinerary = confirmation.raw_payload?.itinerary || [];
  const stays: ConfirmationHotel[] = [];

  let currentHotel = "";
  let checkIn = "";
  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i];
    const hotelName = (day.hotel || "").trim();
    const isPlaceholder = !hotelName || hotelName === "-" || hotelName.toLowerCase() === "n/a";
    if (isPlaceholder) {
      if (currentHotel) {
        stays.push(decorate(currentHotel, checkIn, day.date || itinerary[i - 1]?.date || ""));
        currentHotel = "";
        checkIn = "";
      }
      continue;
    }
    if (hotelName !== currentHotel) {
      if (currentHotel) stays.push(decorate(currentHotel, checkIn, day.date || ""));
      currentHotel = hotelName;
      checkIn = day.date || "";
    }
  }
  if (currentHotel) {
    const lastDay = itinerary[itinerary.length - 1];
    stays.push(decorate(currentHotel, checkIn, lastDay?.date || ""));
  }

  if (stays.length === 0 && confirmation.raw_payload?.hotelBookings) {
    for (const hb of confirmation.raw_payload.hotelBookings) {
      stays.push(decorate(hb.hotelName, hb.checkIn, hb.checkOut));
    }
  }

  return stays.filter((s) => !s.isOwned);
}

export function useSetHotelApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      confirmationId,
      hotelName,
      approved,
    }: {
      confirmationId: string;
      hotelName: string;
      approved: boolean;
    }) => {
      const { data: conf } = await supabase
        .from("confirmations")
        .select("raw_payload")
        .eq("id", confirmationId)
        .maybeSingle();

      const rawPayload =
        conf?.raw_payload && typeof conf.raw_payload === "object"
          ? (conf.raw_payload as Record<string, any>)
          : {};
      const approvals = { ...(rawPayload.hotel_approvals || {}) };
      approvals[hotelName] = {
        approved,
        approved_at: approved ? new Date().toISOString() : undefined,
      };

      const { error } = await supabase
        .from("confirmations")
        .update({ raw_payload: { ...rawPayload, hotel_approvals: approvals } })
        .eq("id", confirmationId);
      if (error) throw error;
      return { confirmationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["confirmation", data.confirmationId] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update approval", description: error.message, variant: "destructive" });
    },
  });
}

export function useMarkHotelsEmailed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      confirmationId,
      hotelNames,
    }: {
      confirmationId: string;
      hotelNames: string[];
    }) => {
      const { data: conf } = await supabase
        .from("confirmations")
        .select("hotels_emailed")
        .eq("id", confirmationId)
        .maybeSingle();

      const existing: string[] = Array.isArray(conf?.hotels_emailed) ? conf!.hotels_emailed : [];
      const merged = Array.from(new Set([...existing, ...hotelNames]));

      const { error } = await supabase
        .from("confirmations")
        .update({ hotels_emailed: merged })
        .eq("id", confirmationId);
      if (error) throw error;
      return { confirmationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["confirmation", data.confirmationId] });
    },
  });
}
