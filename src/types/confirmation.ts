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

export interface ConfirmationPayload {
  clients: Client[];
  arrival: ArrivalInfo;
  departure: DepartureInfo;
  itinerary: ItineraryDay[];
  guestInfo?: GuestInfo;
  trackingNumber?: string;
  services?: string;
  notes?: string;
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
}

export const COMPANY_INFO = {
  name: "LLC Royal Georgian Tours",
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
