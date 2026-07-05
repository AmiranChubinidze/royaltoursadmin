import { describe, it, expect } from "vitest";
import { sumAdditionalExpenses } from "@/lib/confirmationUtils";

describe("sumAdditionalExpenses", () => {
  it("sums amounts across expense rows", () => {
    expect(sumAdditionalExpenses([{ amount: 20 }, { amount: 15 }])).toBe(35);
  });

  it("treats null amounts as zero", () => {
    expect(sumAdditionalExpenses([{ amount: null }, { amount: 10 }])).toBe(10);
  });

  it("returns 0 for undefined or empty list", () => {
    expect(sumAdditionalExpenses(undefined)).toBe(0);
    expect(sumAdditionalExpenses([])).toBe(0);
  });
});
