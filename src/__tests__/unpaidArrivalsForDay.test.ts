import { describe, it, expect } from "vitest";
import { unpaidArrivalsForDay, getHotelStays, roomStayKey } from "@/lib/confirmationUtils";
import type { ConfirmationPayload } from "@/types/confirmation";

const today = new Date(2026, 5, 12); // 12/06/2026

const payload = (over: Partial<ConfirmationPayload>): ConfirmationPayload =>
  ({ clients: [], arrival: { date: "" }, departure: { date: "" }, itinerary: [], ...over } as ConfirmationPayload);

// Itinerary: Marriott (arrives today, 2 nights) -> Villa Rex (owned) -> Hilton (arrives today again, separate stay)
const itinerary = [
  { date: "12/06/2026", day: "", route: "", hotel: "Marriott", roomType: "", meals: "" },
  { date: "13/06/2026", day: "", route: "", hotel: "Marriott", roomType: "", meals: "" },
  { date: "14/06/2026", day: "", route: "", hotel: "Villa Rex", roomType: "", meals: "" },
];

describe("unpaidArrivalsForDay", () => {
  it("flags an unpaid hotel arriving today", () => {
    const res = unpaidArrivalsForDay(payload({ itinerary }), today, new Set());
    expect(res.map((s) => s.hotel)).toEqual(["Marriott"]);
  });

  it("clears once the stay is marked paid (date-keyed)", () => {
    const res = unpaidArrivalsForDay(
      payload({ itinerary, hotel_paid: { [roomStayKey("Marriott", "12/06/2026")]: true } }),
      today,
      new Set()
    );
    expect(res).toHaveLength(0);
  });

  it("excludes owned hotels", () => {
    const it2 = [{ date: "12/06/2026", day: "", route: "", hotel: "Villa Rex", roomType: "", meals: "" }];
    const res = unpaidArrivalsForDay(payload({ itinerary: it2 }), today, new Set(["villa rex"]));
    expect(res).toHaveLength(0);
  });

  it("ignores hotels arriving on a different day", () => {
    const it3 = [{ date: "20/06/2026", day: "", route: "", hotel: "Marriott", roomType: "", meals: "" }];
    expect(unpaidArrivalsForDay(payload({ itinerary: it3 }), today, new Set())).toHaveLength(0);
  });

  it("keeps two non-consecutive stays of the same hotel independent", () => {
    const it4 = [
      { date: "12/06/2026", day: "", route: "", hotel: "Rex Inn", roomType: "", meals: "" },
      { date: "13/06/2026", day: "", route: "", hotel: "Other", roomType: "", meals: "" },
      { date: "14/06/2026", day: "", route: "", hotel: "Rex Inn", roomType: "", meals: "" },
    ];
    expect(getHotelStays(payload({ itinerary: it4 }))).toHaveLength(3);
    // first Rex Inn stay paid, second still unpaid -> only today's (first) matters here
    const res = unpaidArrivalsForDay(
      payload({ itinerary: it4, hotel_paid: { [roomStayKey("Rex Inn", "12/06/2026")]: true } }),
      today,
      new Set()
    );
    expect(res).toHaveLength(0);
  });
});
