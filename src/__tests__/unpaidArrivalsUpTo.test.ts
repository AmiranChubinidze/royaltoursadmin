import { describe, it, expect } from "vitest";
import {
  unpaidArrivalsUpTo,
  daysOverdue,
  getHotelStays,
  roomStayKey,
} from "@/lib/confirmationUtils";
import { overdueSeverity } from "@/components/UnpaidArrivalWarning";
import type { ConfirmationPayload } from "@/types/confirmation";

const today = new Date(2026, 5, 12); // 12/06/2026

const payload = (over: Partial<ConfirmationPayload>): ConfirmationPayload =>
  ({ clients: [], arrival: { date: "" }, departure: { date: "" }, itinerary: [], ...over } as ConfirmationPayload);

// Itinerary: Marriott (arrives today, 2 nights) -> Villa Rex (owned)
const itinerary = [
  { date: "12/06/2026", day: "", route: "", hotel: "Marriott", roomType: "", meals: "" },
  { date: "13/06/2026", day: "", route: "", hotel: "Marriott", roomType: "", meals: "" },
  { date: "14/06/2026", day: "", route: "", hotel: "Villa Rex", roomType: "", meals: "" },
];

const stay = (date: string, hotel = "Marriott") => [
  { date, day: "", route: "", hotel, roomType: "", meals: "" },
];

describe("unpaidArrivalsUpTo", () => {
  it("flags an unpaid hotel arriving today", () => {
    const res = unpaidArrivalsUpTo(payload({ itinerary }), today, new Set());
    expect(res.map((s) => s.hotel)).toEqual(["Marriott"]);
  });

  it("keeps flagging a hotel that was missed on an earlier day", () => {
    // The whole point: yesterday's unpaid hotel must not vanish overnight.
    const res = unpaidArrivalsUpTo(payload({ itinerary: stay("11/06/2026") }), today, new Set());
    expect(res.map((s) => s.checkIn)).toEqual(["11/06/2026"]);
  });

  it("stops nagging past the lookback window", () => {
    const inside = unpaidArrivalsUpTo(payload({ itinerary: stay("20/05/2026") }), today, new Set());
    const outside = unpaidArrivalsUpTo(payload({ itinerary: stay("01/04/2026") }), today, new Set());
    expect(inside).toHaveLength(1); // 23 days ago
    expect(outside).toHaveLength(0); // 72 days ago
  });

  it("clears once the stay is marked paid (date-keyed)", () => {
    const res = unpaidArrivalsUpTo(
      payload({ itinerary, hotel_paid: { [roomStayKey("Marriott", "12/06/2026")]: true } }),
      today,
      new Set()
    );
    expect(res).toHaveLength(0);
  });

  it("excludes owned hotels", () => {
    const res = unpaidArrivalsUpTo(
      payload({ itinerary: stay("12/06/2026", "Villa Rex") }),
      today,
      new Set(["villa rex"])
    );
    expect(res).toHaveLength(0);
  });

  it("drops a stay that was explicitly ignored, even though it's unpaid", () => {
    const res = unpaidArrivalsUpTo(
      payload({ itinerary, hotel_ignored: { [roomStayKey("Marriott", "12/06/2026")]: true } }),
      today,
      new Set()
    );
    expect(res).toHaveLength(0);
  });

  it("ignoring one stay leaves the same hotel's other stay alone (date-keyed)", () => {
    const it5 = [
      { date: "10/06/2026", day: "", route: "", hotel: "Rex Inn", roomType: "", meals: "" },
      { date: "11/06/2026", day: "", route: "", hotel: "Other", roomType: "", meals: "" },
      { date: "12/06/2026", day: "", route: "", hotel: "Rex Inn", roomType: "", meals: "" },
    ];
    const res = unpaidArrivalsUpTo(
      payload({ itinerary: it5, hotel_ignored: { [roomStayKey("Rex Inn", "10/06/2026")]: true } }),
      today,
      new Set()
    );
    expect(res.map((s) => `${s.hotel}@${s.checkIn}`)).toEqual([
      "Other@11/06/2026",
      "Rex Inn@12/06/2026",
    ]);
  });

  it("behaves exactly as before when hotel_ignored is absent or empty", () => {
    const absent = unpaidArrivalsUpTo(payload({ itinerary }), today, new Set());
    const empty = unpaidArrivalsUpTo(payload({ itinerary, hotel_ignored: {} }), today, new Set());
    const falseFlag = unpaidArrivalsUpTo(
      payload({ itinerary, hotel_ignored: { [roomStayKey("Marriott", "12/06/2026")]: false } }),
      today,
      new Set()
    );
    expect(absent.map((s) => s.hotel)).toEqual(["Marriott"]);
    expect(empty).toEqual(absent);
    expect(falseFlag).toEqual(absent);
  });

  it("ignores future arrivals — not a warning yet", () => {
    expect(unpaidArrivalsUpTo(payload({ itinerary: stay("20/06/2026") }), today, new Set())).toHaveLength(0);
  });

  it("keeps two non-consecutive stays of the same hotel independent", () => {
    const it4 = [
      { date: "10/06/2026", day: "", route: "", hotel: "Rex Inn", roomType: "", meals: "" },
      { date: "11/06/2026", day: "", route: "", hotel: "Other", roomType: "", meals: "" },
      { date: "12/06/2026", day: "", route: "", hotel: "Rex Inn", roomType: "", meals: "" },
    ];
    expect(getHotelStays(payload({ itinerary: it4 }))).toHaveLength(3);
    // Both Rex Inn stays are now in range; paying the first must not clear the second.
    const res = unpaidArrivalsUpTo(
      payload({ itinerary: it4, hotel_paid: { [roomStayKey("Rex Inn", "10/06/2026")]: true } }),
      today,
      new Set()
    );
    expect(res.map((s) => `${s.hotel}@${s.checkIn}`)).toEqual([
      "Other@11/06/2026",
      "Rex Inn@12/06/2026",
    ]);
  });
});

describe("overdueSeverity", () => {
  it("bands today / recent / stale so the chip colour carries the meaning", () => {
    expect(overdueSeverity(0).label).toBe("Today");
    expect(overdueSeverity(0).className).toContain("amber-100");
    expect(overdueSeverity(3).label).toBe("3d late");
    expect(overdueSeverity(3).className).toContain("amber-200");
    expect(overdueSeverity(4).label).toBe("4d late");
    expect(overdueSeverity(4).className).toContain("rose");
  });
});

describe("daysOverdue", () => {
  it("is 0 for today and counts whole days back", () => {
    expect(daysOverdue("12/06/2026", today)).toBe(0);
    expect(daysOverdue("09/06/2026", today)).toBe(3);
  });

  it("never goes negative for a future check-in", () => {
    expect(daysOverdue("20/06/2026", today)).toBe(0);
  });
});
