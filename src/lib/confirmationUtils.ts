import { supabase } from "@/integrations/supabase/client";
import { ConfirmationPayload, HotelBooking, ItineraryDay } from "@/types/confirmation";
import type { SavedHotel } from "@/hooks/useSavedData";

export function formatDateToDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Alias matching the name used across components
export const formatDateDDMMYYYY = formatDateToDDMMYYYY;

export function parseDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Alias matching the name used across components
export const parseDateDDMMYYYY = parseDDMMYYYY;

export function datePlusDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function getDateCode(dateStr: string): string {
  // Convert dd/mm/yyyy to ddmmyyyy
  return dateStr.replace(/\//g, "");
}

// Convert a DD/MM/YYYY string to an ISO YYYY-MM-DD string suitable for a
// Postgres DATE column. Falls back to today if the input isn't parseable.
// IMPORTANT: never pass DD/MM/YYYY directly into transactions.date — Postgres
// reads it as MM/DD and rejects days > 12, silently dropping the row.
export function isoDateFromDdMmYyyy(dateStr: string | null | undefined): string {
  if (dateStr) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return new Date().toISOString().split("T")[0];
}

export function calculateDaysAndNights(
  arrivalDate: string,
  departureDate: string
): { days: number; nights: number } {
  const arrival = parseDDMMYYYY(arrivalDate);
  const departure = parseDDMMYYYY(departureDate);

  if (!arrival || !departure) {
    return { days: 1, nights: 0 };
  }

  const diffTime = Math.abs(departure.getTime() - arrival.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    days: diffDays + 1,
    nights: diffDays,
  };
}

export async function generateConfirmationCode(
  arrivalDateStr: string,
  excludeId?: string
): Promise<string> {
  const dateCode = getDateCode(arrivalDateStr);

  // Count existing confirmations with same date_code
  let query = supabase
    .from("confirmations")
    .select("id", { count: "exact" })
    .eq("date_code", dateCode);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count } = await query;
  const existingCount = count || 0;

  // Determine letter based on count
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter = letters[existingCount] || "Z";

  return `${letter}${dateCode}`;
}

export function generateItineraryDays(
  arrivalDate: string,
  departureDate: string
): { date: string; day: string }[] {
  const arrival = parseDDMMYYYY(arrivalDate);
  const departure = parseDDMMYYYY(departureDate);

  if (!arrival || !departure) return [];

  const days: { date: string; day: string }[] = [];
  const currentDate = new Date(arrival);
  let dayNum = 1;

  while (currentDate <= departure) {
    days.push({
      date: formatDateToDDMMYYYY(currentDate),
      day: `Day ${dayNum}`,
    });
    currentDate.setDate(currentDate.getDate() + 1);
    dayNum++;
  }

  return days;
}

export function generateItineraryFromBookings(hotelBookings: HotelBooking[]): ItineraryDay[] {
  if (!hotelBookings || hotelBookings.length === 0) return [];

  const sortedBookings = [...hotelBookings].sort((a, b) => {
    const dateA = parseDDMMYYYY(a.checkIn);
    const dateB = parseDDMMYYYY(b.checkIn);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  const allCheckIns = sortedBookings.map((b) => parseDDMMYYYY(b.checkIn)).filter((d): d is Date => d !== null);
  const allCheckOuts = sortedBookings.map((b) => parseDDMMYYYY(b.checkOut)).filter((d): d is Date => d !== null);

  if (allCheckIns.length === 0 || allCheckOuts.length === 0) return [];

  const earliestCheckIn = new Date(Math.min(...allCheckIns.map((d) => d.getTime())));
  const latestCheckOut = new Date(Math.max(...allCheckOuts.map((d) => d.getTime())));

  const itinerary: ItineraryDay[] = [];
  let currentDate = new Date(earliestCheckIn);

  while (currentDate < latestCheckOut) {
    const dateStr = formatDateToDDMMYYYY(currentDate);

    let hotelForNight: HotelBooking | undefined;
    for (const booking of sortedBookings) {
      const checkIn = parseDDMMYYYY(booking.checkIn);
      const checkOut = parseDDMMYYYY(booking.checkOut);
      if (checkIn && checkOut && currentDate >= checkIn && currentDate < checkOut) {
        hotelForNight = booking;
        break;
      }
    }

    itinerary.push({
      date: dateStr,
      day: "",
      route: "",
      hotel: hotelForNight?.hotelName || "",
      roomType: hotelForNight?.roomCategory || "",
      meals: "YES",
    });

    currentDate = datePlusDays(currentDate, 1);
  }

  return itinerary;
}

export function countHotelNights(
  itinerary: Array<{ hotel?: string }>,
  hotelIds: string[],
  savedHotels: SavedHotel[]
): number {
  if (!hotelIds.length) return 0;
  const targets = savedHotels.filter((sh) => hotelIds.includes(sh.id));
  if (!targets.length) return 0;
  return itinerary.filter((day) => {
    const h = String(day?.hotel || "").toUpperCase().trim();
    return h.length > 0 && targets.some((sh) => h.includes(sh.name.toUpperCase().trim()));
  }).length;
}

// ---- Owned-hotel room tracking ----

export interface OwnedRoomStay {
  stayKey: string;
  hotelId: string;
  hotelName: string;
  checkIn: string;   // raw dd/mm/yyyy of the first day of the stay
  checkOut: string;  // raw dd/mm/yyyy of the last day of the stay
  dates: string[];   // raw date of every day in the stay
  nights: number;
  roomCount: number; // hotel capacity
}

// Stable key for a stay's room usage. Same hotel booked on different check-in
// dates → different keys (so two non-consecutive stays stay independent).
export function roomStayKey(hotelName: string, checkIn: string): string {
  return `${hotelName.trim().toLowerCase()}::${checkIn.trim()}`;
}

// Detect consecutive-day stays at company-owned hotels that have room tracking on.
// Grouped in itinerary array order so the keys are IDENTICAL wherever this runs —
// the confirmation form (writes room_usage) and the calendar (reads it). An empty
// hotel day or a different hotel breaks the run.
export function getOwnedRoomStays(
  itinerary: Array<{ hotel?: string; date?: string }>,
  savedHotels: SavedHotel[]
): OwnedRoomStay[] {
  const owned = new Map<string, SavedHotel>();
  for (const h of savedHotels) {
    if (h.is_owned && h.room_count != null) owned.set(h.name.trim().toLowerCase(), h);
  }
  if (owned.size === 0) return [];

  const stays: OwnedRoomStay[] = [];
  let i = 0;
  while (i < itinerary.length) {
    const hotelName = String(itinerary[i]?.hotel || "").trim();
    if (!hotelName) {
      i++;
      continue;
    }
    const key = hotelName.toLowerCase();
    const dates: string[] = [];
    let j = i;
    while (j < itinerary.length && String(itinerary[j]?.hotel || "").trim().toLowerCase() === key) {
      const d = String(itinerary[j]?.date || "").trim();
      if (d) dates.push(d);
      j++;
    }
    const match = owned.get(key);
    if (match && dates.length > 0) {
      stays.push({
        stayKey: roomStayKey(match.name, dates[0]),
        hotelId: match.id,
        hotelName: match.name,
        checkIn: dates[0],
        checkOut: dates[dates.length - 1],
        dates,
        nights: dates.length,
        roomCount: match.room_count as number,
      });
    }
    i = j;
  }
  return stays;
}

// ---- Hotel stay derivation + unpaid-arrival warning ----

export interface HotelStay {
  hotel: string;
  checkIn: string;  // raw dd/mm/yyyy of first day
  checkOut: string; // raw dd/mm/yyyy of last day
}

// Derive hotel stays from a confirmation payload. Each consecutive run of the
// same hotel in the itinerary = one stay. Placeholder days ("-"/"n/a") break a
// run. Falls back to draft hotelBookings when the itinerary has no hotels.
// Single source of truth shared by ConfirmationAttachments + the warning logic.
export function getHotelStays(payload: ConfirmationPayload | null | undefined): HotelStay[] {
  const itinerary = payload?.itinerary || [];
  const stays: HotelStay[] = [];
  let currentHotel = "";
  let checkIn = "";
  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i];
    const hotelName = (day.hotel || "").trim();
    if (!hotelName || hotelName === "-" || hotelName.toLowerCase() === "n/a") {
      if (currentHotel) {
        stays.push({ hotel: currentHotel, checkIn, checkOut: day.date || itinerary[i - 1]?.date || "" });
        currentHotel = "";
        checkIn = "";
      }
      continue;
    }
    if (hotelName !== currentHotel) {
      if (currentHotel) {
        stays.push({ hotel: currentHotel, checkIn, checkOut: day.date || "" });
      }
      currentHotel = hotelName;
      checkIn = day.date || "";
    }
  }
  if (currentHotel) {
    stays.push({ hotel: currentHotel, checkIn, checkOut: itinerary[itinerary.length - 1]?.date || "" });
  }

  if (stays.length === 0 && payload?.hotelBookings) {
    for (const hb of payload.hotelBookings) {
      stays.push({ hotel: hb.hotelName, checkIn: hb.checkIn, checkOut: hb.checkOut });
    }
  }
  return stays;
}

// Hotels whose guests check in on `today` and which aren't marked paid.
// `today` and each stay's check-in are compared at day granularity.
// Owned (company) hotels are excluded — you don't pay yourself.
export function unpaidArrivalsForDay(
  payload: ConfirmationPayload | null | undefined,
  today: Date,
  ownedLowerSet: Set<string>
): HotelStay[] {
  const paid = payload?.hotel_paid || {};
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return getHotelStays(payload).filter((stay) => {
    const lower = stay.hotel.trim().toLowerCase();
    if (ownedLowerSet.has(lower)) return false;
    const d = parseDDMMYYYY(stay.checkIn);
    if (!d) return false;
    if (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() !== t) return false;
    return paid[roomStayKey(stay.hotel, stay.checkIn)] !== true;
  });
}

export function getMainClientName(clients: { name: string; passport: string }[]): string {
  const validClients = clients.filter((c) => c.name.trim());
  return validClients.length > 0 ? validClients[0].name : "";
}

export function validateConfirmationData(data: {
  arrival: { date: string };
  departure: { date: string };
  clients: { name: string; passport: string }[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.arrival.date) {
    errors.push("Arrival date is required");
  }

  if (!data.departure.date) {
    errors.push("Departure date is required");
  }

  if (data.arrival.date && data.departure.date) {
    const arrival = parseDDMMYYYY(data.arrival.date);
    const departure = parseDDMMYYYY(data.departure.date);
    if (arrival && departure && departure < arrival) {
      errors.push("Departure date must be after arrival date");
    }
  }

  const validClients = data.clients.filter(
    (c) => c.name.trim() && c.passport.trim()
  );
  if (validClients.length === 0) {
    errors.push("At least one client with name and passport is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
