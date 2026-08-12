import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSavedHotels } from "@/hooks/useSavedData";
import { unpaidArrivalsUpTo, daysOverdue } from "@/lib/confirmationUtils";
import type { ConfirmationPayload } from "@/types/confirmation";

export interface UnpaidArrival {
  confirmationId: string;
  confirmationCode: string;
  clientName: string | null;
  hotel: string;
  checkIn: string; // dd/mm/yyyy
  daysLate: number; // 0 = arriving today
}

interface ArrivalRow {
  id: string;
  confirmation_code: string;
  main_client_name: string | null;
  raw_payload: ConfirmationPayload;
}

// Own focused query rather than the dashboard's 50-row list: today's arrivals
// sort BELOW every future booking (order is by arrival date desc), so they can
// fall outside the visible window. Light projection (4 cols) keeps it cheap.
// ponytail: bounded scan of 500 — raise if this client ever exceeds it.
function useArrivalRows() {
  return useQuery({
    queryKey: ["unpaid-arrival-rows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("confirmations")
        .select("id, confirmation_code, main_client_name, raw_payload")
        .order("date_code", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as ArrivalRow[];
    },
    staleTime: 60_000,
  });
}

// Hotels whose guests have checked in (today or recently) and still aren't
// marked paid. Overdue stays stay on the banner until they're settled — the
// original today-only version dropped a missed hotel the next morning.
export function useUnpaidArrivalsToday() {
  const { data: rows } = useArrivalRows();
  const { data: savedHotels } = useSavedHotels();

  return useMemo(() => {
    const ownedLower = new Set(
      (savedHotels || [])
        .filter((h) => h.is_owned)
        .map((h) => h.name.trim().toLowerCase())
    );
    const today = new Date();

    const arrivals: UnpaidArrival[] = [];
    for (const c of rows || []) {
      for (const stay of unpaidArrivalsUpTo(c.raw_payload, today, ownedLower)) {
        arrivals.push({
          confirmationId: c.id,
          confirmationCode: c.confirmation_code,
          clientName: c.main_client_name,
          hotel: stay.hotel,
          checkIn: stay.checkIn,
          daysLate: daysOverdue(stay.checkIn, today),
        });
      }
    }
    // Most overdue first — the debt that's been sitting longest is the one
    // that needs chasing, and it's the one the old version made invisible.
    arrivals.sort((a, b) => b.daysLate - a.daysLate);
    return { arrivals, confirmationIds: new Set(arrivals.map((a) => a.confirmationId)) };
  }, [rows, savedHotels]);
}
