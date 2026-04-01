import { supabase } from "@/integrations/supabase/client";
import { ConfirmationPayload, HotelBooking, ItineraryDay } from "@/types/confirmation";

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
