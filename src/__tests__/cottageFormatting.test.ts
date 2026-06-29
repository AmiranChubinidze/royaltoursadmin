import { describe, it, expect } from "vitest";
import { formatGuests, cottageNumberLabel } from "@/components/CottageConfirmationLetter";
import type { ConfirmationPayload } from "@/types/confirmation";

describe("formatGuests", () => {
  it("formats adults + one child with age (matches the confirmation PDF)", () => {
    expect(formatGuests({ numAdults: 6, numKids: 1, kidsAges: [{ age: 4 }] })).toBe(
      "6 Adults + 1 Child (4 years)"
    );
  });

  it("singularizes a single adult and no kids", () => {
    expect(formatGuests({ numAdults: 1, numKids: 0, kidsAges: [] })).toBe("1 Adult");
  });

  it("handles multiple children with ages", () => {
    expect(formatGuests({ numAdults: 2, numKids: 2, kidsAges: [{ age: 4 }, { age: 6 }] })).toBe(
      "2 Adults + 2 Children (4, 6 years)"
    );
  });

  it("omits ages when none provided", () => {
    expect(formatGuests({ numAdults: 2, numKids: 1, kidsAges: [] })).toBe("2 Adults + 1 Child");
  });

  it("returns dash for missing guest info", () => {
    expect(formatGuests(undefined)).toBe("—");
  });
});

describe("cottageNumberLabel", () => {
  const base = { itinerary: [] } as unknown as ConfirmationPayload;

  it("renders a single cottage number", () => {
    expect(cottageNumberLabel({ ...base, room_numbers: { "inn martvili::18/07/2026": [2] } })).toBe("No. 2");
  });

  it("renders and sorts multiple cottage numbers", () => {
    expect(cottageNumberLabel({ ...base, room_numbers: { "inn martvili::02/07/2026": [2, 1] } })).toBe(
      "No. 1, 2"
    );
  });

  it("returns dash when no rooms set", () => {
    expect(cottageNumberLabel(base)).toBe("—");
  });
});
