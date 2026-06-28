export interface Client {
  name: string;
  passport: string;
  isMainGuest?: boolean;
}

export interface KidInfo {
  age: number;
}

export interface GuestInfo {
  numAdults: number;
  numKids: number;
  kidsAges: KidInfo[];
}

export interface ItineraryDay {
  date: string;
  day: string;
  route: string;
  hotel: string;
  roomType: string;
  meals: string;
}

export interface ArrivalInfo {
  date: string;
  time: string;
  flight: string;
  from: string;
}

export interface DepartureInfo {
  date: string;
  time: string;
  flight: string;
  to: string;
}

// Hotel booking info for draft confirmations (booking request flow)
export interface HotelBooking {
  hotelId: string;
  hotelName: string;
  hotelEmail: string;
  checkIn: string;
  checkOut: string;
  numAdults: number;
  numKids: number;
  mealType: "BB" | "FB";
  roomCategory: "Standard" | "Upgrade";
}

export interface ConfirmationPayload {
  clients: Client[];
  arrival: ArrivalInfo;
  departure: DepartureInfo;
  itinerary: ItineraryDay[];
  guestInfo?: GuestInfo;
  trackingNumber?: string;
  services?: string;
  notes?: string;
  tourSource?: string;
  price?: number | null;
  priceCurrency?: "USD" | "GEL";
  selectedRuleIds?: string[];
  // Passenger ID document attachments (for insured tours)
  id_attachment_ids?: string[];
  // For draft confirmations from booking requests
  hotelBookings?: HotelBooking[];
  // Per-hotel booking approval tracking (keyed by hotel name)
  hotel_approvals?: Record<string, { approved: boolean; approved_at?: string }>;
  // Rooms taken per owned-hotel stay (keyed by roomStayKey: hotelLower::checkIn)
  room_usage?: Record<string, number>;
  // Invoice tracking
  invoice_amounts?: Record<string, { amount: number; currency?: string }>;
  invoice_checks?: string[];
  // Attachment to hotel stay mapping
  attachment_stay_map?: Record<string, string>;
  // Per-stay paid snapshot, keyed by roomStayKey (hotelLower::checkInRaw).
  // Written by ConfirmationAttachments when it recomputes is_paid; read by the
  // unpaid-arrival warning (dashboard + email). See unpaidArrivalsForDay.
  hotel_paid?: Record<string, boolean>;
  // Per-stay invoice amount due, same roomStayKey. Persisted alongside hotel_paid
  // (the amount derives from mapped invoice attachments, so it can't be read
  // server-side). Read by the warning email to show price + total per hotel.
  hotel_amounts?: Record<string, { amount: number; currency: string }>;
}

export interface Confirmation {
  id: string;
  confirmation_code: string;
  date_code: string;
  confirmation_date: string;
  main_client_name: string | null;
  tour_source: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  total_days: number | null;
  total_nights: number | null;
  raw_payload: ConfirmationPayload;
  created_at: string;
  updated_at: string;
  status: string;
  hotels_emailed: string[] | null;
  is_paid: boolean | null;  // We paid hotels
  paid_at: string | null;
  notes: string | null;
  price: number | null;
  price_currency: "USD" | "GEL" | null;
  client_paid: boolean | null;  // Client paid us
  client_paid_at: string | null;
  client_paid_by: string | null;
}

export interface ConfirmationFormData {
  tourSource: string;
  trackingNumber: string;
  clients: Client[];
  guestInfo: GuestInfo;
  arrival: ArrivalInfo;
  departure: DepartureInfo;
  itinerary: ItineraryDay[];
  services: string;
  notes: string;
  price: number | null;
  priceCurrency: "USD" | "GEL";
  selectedRuleIds: string[];
  room_usage?: Record<string, number>;
}

export const COMPANY_INFO = {
  name: "Royal Georgian Tours",
  phone: "+995 599 123 456",
  email: "Royalgeorgiantours@gmail.com",
  address: "Tbilisi, Georgia",
};

export const TOUR_SOURCES = [
  "Viator",
  "GetYourGuide",
  "TripAdvisor",
  "Direct",
  "Travel Agent",
  "Other",
];

export const HOTEL_EMAILS: Record<string, string> = {
  "Marriott Tbilisi": "reservations@marriott-tbilisi.ge",
  "Rooms Hotel Tbilisi": "booking@roomshotels.com",
  "Radisson Blu Batumi": "info@radissonblu-batumi.ge",
  "Hotel & Spa Alazani Valley": "info@alazanivalleyhotel.ge",
  "Château Mere": "reservations@chateaumere.ge",
};
