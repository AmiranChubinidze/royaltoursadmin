import { describe, it, expect } from "vitest";
import { takenRoomNumbers, type RoomBooking } from "@/lib/confirmationUtils";

const stay = { hotelName: "Villa Rex", dates: ["12/06/2026", "13/06/2026"] };

describe("takenRoomNumbers", () => {
  it("marks rooms taken by an overlapping stay at the same hotel", () => {
    const others: RoomBooking[] = [
      { hotelLower: "villa rex", dates: ["13/06/2026", "14/06/2026"], numbers: [3, 5] },
    ];
    expect([...takenRoomNumbers(stay, others)].sort()).toEqual([3, 5]);
  });

  it("ignores stays at a different hotel", () => {
    const others: RoomBooking[] = [
      { hotelLower: "onyx", dates: ["12/06/2026"], numbers: [1, 2] },
    ];
    expect(takenRoomNumbers(stay, others).size).toBe(0);
  });

  it("ignores same-hotel stays with no shared night", () => {
    const others: RoomBooking[] = [
      { hotelLower: "villa rex", dates: ["20/06/2026", "21/06/2026"], numbers: [3] },
    ];
    expect(takenRoomNumbers(stay, others).size).toBe(0);
  });

  it("unions across multiple overlapping bookings", () => {
    const others: RoomBooking[] = [
      { hotelLower: "villa rex", dates: ["12/06/2026"], numbers: [1] },
      { hotelLower: "villa rex", dates: ["13/06/2026"], numbers: [2, 1] },
    ];
    expect([...takenRoomNumbers(stay, others)].sort()).toEqual([1, 2]);
  });
});
