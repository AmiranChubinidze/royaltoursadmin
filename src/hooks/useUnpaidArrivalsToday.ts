import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSavedHotels } from "@/hooks/useSavedData";
import { unpaidArrivalsUpTo, daysOverdue, roomStayKey } from "@/lib/confirmationUtils";
import type { ConfirmationPayload } from "@/types/confirmation";

export interface UnpaidArrival {
  confirmationId: string;
  confirmationCode: string;
  clientName: string | null;
  hotel: string;
  checkIn: string; // dd/mm/yyyy
  daysLate: number; // 0 = arriving today
  amount: number | null; // null when no invoice amount is mapped yet
  currency: string;
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
      // Amount due per stay, keyed the same way as hotel_paid. Already persisted
      // for the warning email — reading it here costs nothing and turns "which
      // hotels" into "how much money".
      const amounts = c.raw_payload?.hotel_amounts || {};
      for (const stay of unpaidArrivalsUpTo(c.raw_payload, today, ownedLower)) {
        const due = amounts[roomStayKey(stay.hotel, stay.checkIn)];
        arrivals.push({
          confirmationId: c.id,
          confirmationCode: c.confirmation_code,
          clientName: c.main_client_name,
          hotel: stay.hotel,
          checkIn: stay.checkIn,
          daysLate: daysOverdue(stay.checkIn, today),
          amount: typeof due?.amount === "number" ? due.amount : null,
          currency: due?.currency || "USD",
        });
      }
    }
    // Most recent check-in first: today at the top, then yesterday, then older.
    // Reads as a diary rather than a debt ranking — the severity chip already
    // carries urgency, so the order doesn't need to.
    arrivals.sort((a, b) => a.daysLate - b.daysLate);
    return { arrivals, confirmationIds: new Set(arrivals.map((a) => a.confirmationId)) };
  }, [rows, savedHotels]);
}
