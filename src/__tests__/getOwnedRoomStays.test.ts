import { describe, it, expect } from "vitest";
import { getOwnedRoomStays, roomStayKey } from "@/lib/confirmationUtils";
import type { SavedHotel } from "@/hooks/useSavedData";

const hotel = (over: Partial<SavedHotel>): SavedHotel => ({
  id: "x",
  name: "X",
  email: null,
  address: null,
  activities: [],
  is_owned: false,
  room_count: null,
  created_at: "",
  ...over,
});

const onyx = hotel({ id: "onyx", name: "ONYX", is_owned: true, room_count: 10 });
const villa = hotel({ id: "villa", name: "Villa Rex", is_owned: true, room_count: 4 });
const partner = hotel({ id: "m", name: "Marriott", is_owned: false, room_count: null });
const untracked = hotel({ id: "u", name: "Cabin", is_owned: true, room_count: null });
const hotels = [onyx, villa, partner, untracked];

describe("getOwnedRoomStays", () => {
  it("groups consecutive owned-hotel days into one stay", () => {
    const stays = getOwnedRoomStays(
      [
        { hotel: "ONYX", date: "12/06/2026" },
        { hotel: "ONYX", date: "13/06/2026" },
        { hotel: "ONYX", date: "14/06/2026" },
      ],
      hotels
    );
    expect(stays).toHaveLength(1);
    expect(stays[0].nights).toBe(3);
    expect(stays[0].stayKey).toBe(roomStayKey("ONYX", "12/06/2026"));
    expect(stays[0].roomCount).toBe(10);
  });

  it("treats the same hotel on non-consecutive dates as two distinct stays", () => {
    const stays = getOwnedRoomStays(
      [
        { hotel: "ONYX", date: "12/06/2026" },
        { hotel: "Marriott", date: "13/06/2026" },
        { hotel: "ONYX", date: "14/06/2026" },
      ],
      hotels
    );
    expect(stays).toHaveLength(2);
    expect(stays[0].stayKey).not.toBe(stays[1].stayKey);
  });

  it("excludes partner hotels and owned hotels without room tracking", () => {
    const stays = getOwnedRoomStays(
      [
        { hotel: "Marriott", date: "12/06/2026" },
        { hotel: "Cabin", date: "13/06/2026" },
      ],
      hotels
    );
    expect(stays).toHaveLength(0);
  });

  it("breaks a run on an empty-hotel day", () => {
    const stays = getOwnedRoomStays(
      [
        { hotel: "Villa Rex", date: "12/06/2026" },
        { hotel: "", date: "13/06/2026" },
        { hotel: "Villa Rex", date: "14/06/2026" },
      ],
      hotels
    );
    expect(stays).toHaveLength(2);
  });
});
