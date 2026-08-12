import { describe, it, expect } from "vitest";
import { byArrivalDateDesc } from "@/lib/confirmationUtils";

const row = (arrival_date: string | null, created_at = "2026-08-01T00:00:00Z") => ({
  arrival_date,
  created_at,
});

describe("byArrivalDateDesc", () => {
  it("puts the most recent arrival date first", () => {
    const sorted = [row("17/08/2026"), row("30/08/2026"), row("19/08/2026")]
      .sort(byArrivalDateDesc)
      .map((r) => r.arrival_date);
    expect(sorted).toEqual(["30/08/2026", "19/08/2026", "17/08/2026"]);
  });

  it("keeps single-digit days in chronological order (the DDMMYYYY string bug)", () => {
    // Lexicographically "01082026" < "13082026" < "26082026", which is what a
    // SQL sort on the raw string gives. Chronologically they're the same order
    // here — but across months the string sort breaks, so check that too.
    const sorted = [row("13/08/2026"), row("01/09/2026"), row("03/08/2026"), row("26/08/2026")]
      .sort(byArrivalDateDesc)
      .map((r) => r.arrival_date);
    expect(sorted).toEqual(["01/09/2026", "26/08/2026", "13/08/2026", "03/08/2026"]);
  });

  it("sends rows with a missing or unparseable arrival date to the end", () => {
    const sorted = [row(null), row("17/08/2026"), row("not-a-date")]
      .sort(byArrivalDateDesc)
      .map((r) => r.arrival_date);
    expect(sorted[0]).toBe("17/08/2026");
    expect(sorted.slice(1).sort()).toEqual([null, "not-a-date"].sort());
  });

  it("breaks same-day ties by newest created first", () => {
    const sorted = [
      row("17/08/2026", "2026-08-01T09:00:00Z"),
      row("17/08/2026", "2026-08-01T17:00:00Z"),
    ]
      .sort(byArrivalDateDesc)
      .map((r) => r.created_at);
    expect(sorted).toEqual(["2026-08-01T17:00:00Z", "2026-08-01T09:00:00Z"]);
  });
});
