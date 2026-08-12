import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnpaidArrivalsBanner } from "@/components/UnpaidArrivalWarning";
import type { UnpaidArrival } from "@/hooks/useUnpaidArrivalsToday";

const arrival = (over: Partial<UnpaidArrival> = {}): UnpaidArrival => ({
  confirmationId: "c1",
  confirmationCode: "A11082026",
  clientName: "TWENTIES",
  hotel: "Komorebi Bakuriani",
  checkIn: "11/08/2026",
  daysLate: 0,
  amount: null,
  currency: "GEL",
  ...over,
});

const renderBanner = (arrivals: UnpaidArrival[]) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <UnpaidArrivalsBanner arrivals={arrivals} />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe("UnpaidArrivalsBanner", () => {
  it("never nests the ignore button inside the navigating button", () => {
    // The row used to be a single <button>; adding Ignore inside it would be
    // invalid markup and would break keyboard navigation.
    const { container } = renderBanner([arrival(), arrival({ confirmationId: "c2" })]);
    expect(container.querySelector("button button")).toBeNull();
  });

  it("totals per currency and never sums across them", () => {
    renderBanner([
      arrival({ amount: 477, currency: "GEL" }),
      arrival({ confirmationId: "c2", amount: 100, currency: "GEL" }),
      arrival({ confirmationId: "c3", amount: 50, currency: "USD" }),
    ]);
    expect(screen.getByText("₾577 · $50")).toBeTruthy();
  });

  it("counts overdue rows separately from the total", () => {
    renderBanner([
      arrival({ daysLate: 5 }),
      arrival({ confirmationId: "c2", daysLate: 1 }),
      arrival({ confirmationId: "c3", daysLate: 0 }),
    ]);
    expect(screen.getByText(/3 unpaid hotels/)).toBeTruthy();
    expect(screen.getByText(/2 overdue/)).toBeTruthy();
  });

  it("collapses past four rows behind a 'more' toggle", () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      arrival({ confirmationId: `c${i}`, hotel: `Hotel ${i}` })
    );
    renderBanner(many);
    expect(screen.getByText("2 more")).toBeTruthy();
  });

  it("renders nothing when there is nothing to warn about", () => {
    const { container } = renderBanner([]);
    expect(container.firstChild).toBeNull();
  });
});
