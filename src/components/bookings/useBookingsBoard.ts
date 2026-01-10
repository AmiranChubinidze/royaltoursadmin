import { useMemo, useRef, useEffect } from "react";
import { isWithinInterval } from "date-fns";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useTransactions, Transaction, useBulkCreateTransactions } from "@/hooks/useTransactions";
import { useExpenses } from "@/hooks/useExpenses";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BookingRow, LooseTransaction, ProblemFilter } from "./types";

const MEALS_RATE_PER_2_ADULTS = 15;
const MEALS_HOTELS = ["INN MARTVILI", "ORBI"];

const isoDateFromDdMmYyyy = (dateStr: string | null | undefined) => {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
};

const calculateMealsFromPayload = (rawPayload: unknown) => {
  const payload = rawPayload as any;
  const itinerary = (payload?.itinerary as any[]) || [];
  const numAdults = Number(payload?.guestInfo?.numAdults) || 2;

  const mealsNights = itinerary.filter((day) => {
    const hotelName = String(day?.hotel || "").toUpperCase().trim();
    return MEALS_HOTELS.some((h) => hotelName.includes(h));
  }).length;

  const mealsExpense = Math.ceil(numAdults / 2) * MEALS_RATE_PER_2_ADULTS * mealsNights;

  return { mealsNights, mealsExpense, numAdults };
};

const parseConfirmationDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

interface UseBookingsBoardProps {
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
  problemFilter?: ProblemFilter;
  onlyProblems?: boolean;
}

export function useBookingsBoard({
  dateFrom,
  dateTo,
  searchQuery = "",
  problemFilter = null,
  onlyProblems = false,
}: UseBookingsBoardProps) {
  const { data: confirmations, isLoading: confirmationsLoading } = useConfirmations(500);
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({ dateFrom, dateTo });
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const { exchangeRate } = useCurrency();
  const bulkCreateTransactions = useBulkCreateTransactions();
  const createdMealsRef = useRef<Set<string>>(new Set());

  const isLoading = confirmationsLoading || transactionsLoading || expensesLoading;

  // Convert amount to USD (base currency) for consistent summing
  const toUSD = (amount: number, currency?: string): number => {
    if (currency === "GEL") {
      return amount / exchangeRate;
    }
    return amount;
  };

  // Loose transactions: transactions without a confirmation_id
  const looseTransactions = useMemo<LooseTransaction[]>(() => {
    if (!transactions || !confirmations) return [];
    
    const loose = transactions.filter((t) => !t.confirmation_id);
    
    // Add suggested booking based on date proximity and amount matching
    return loose.map((t) => {
      // Simple suggestion: find a confirmation with similar arrival date
      const txDate = new Date(t.date);
      let bestMatch: { code: string; id: string; confidence: number } | null = null;
      
      for (const c of confirmations) {
        if (!c.price) continue;
        const arrivalDate = parseConfirmationDate(c.arrival_date);
        if (!arrivalDate) continue;
        
        // Check if dates are within 3 days
        const daysDiff = Math.abs((txDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 3) {
          const priceMatch = Math.abs(Number(c.price) - t.amount) / Number(c.price);
          const confidence = Math.max(0, Math.min(100, Math.round((1 - priceMatch) * 70 + (1 - daysDiff / 3) * 30)));
          
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = {
              code: c.confirmation_code,
              id: c.id,
              confidence,
            };
          }
        }
      }
      
      return {
        ...t,
        suggestedBooking: bestMatch && bestMatch.confidence > 50 ? bestMatch : null,
      };
    });
  }, [transactions, confirmations]);

  // Build booking rows
  const bookingRows = useMemo<BookingRow[]>(() => {
    if (!confirmations) return [];

    return confirmations
      .filter((c) => {
        // Filter by date range
        if (dateFrom || dateTo) {
          const arrivalDate = parseConfirmationDate(c.arrival_date);
          if (!arrivalDate) return false;
          if (dateFrom && dateTo) {
            return isWithinInterval(arrivalDate, { start: dateFrom, end: dateTo });
          }
          if (dateFrom) return arrivalDate >= dateFrom;
          if (dateTo) return arrivalDate <= dateTo;
        }
        return true;
      })
      .filter((c) => {
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            c.confirmation_code?.toLowerCase().includes(query) ||
            c.main_client_name?.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .map((c) => {
        const confirmationTransactions = transactions?.filter((t) => t.confirmation_id === c.id) || [];
        const confirmationExpenses = expenses?.filter((e) => e.confirmation_id === c.id) || [];
        const revenue = Number(c.price) || 0;
        const days = c.total_days || 1;

        // Calculate meals expense
        const { mealsNights, mealsExpense } = calculateMealsFromPayload(c.raw_payload);

        // Calculate received (confirmed "in" transactions only) - convert to USD
        const received = confirmationTransactions
          .filter((t) => t.kind === "in" && t.status === "confirmed")
          .reduce((sum, t) => sum + toUSD(t.amount, t.currency), 0);

        // Calculate ALL confirmed expense transactions (kind=out, status=confirmed) - convert to USD
        const allExpenseTransactions = confirmationTransactions
          .filter((t) => t.kind === "out" && t.status === "confirmed")
          .reduce((sum, t) => sum + toUSD(t.amount, t.currency), 0);

        // Get invoice expenses
        const invoiceExpensesTotal = confirmationExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Get meals expense from transaction or calculate
        const mealsTransaction = confirmationTransactions.find((t) => t.category === "breakfast");
        const actualMealsExpense = mealsTransaction ? mealsTransaction.amount : mealsExpense;

        // Total expenses
        const hasMealsInTransactions = !!mealsTransaction;
        const totalExpenses = allExpenseTransactions + 
          invoiceExpensesTotal + 
          (hasMealsInTransactions ? 0 : actualMealsExpense);

        const remaining = revenue - received;
        const net = revenue - totalExpenses;

        // Determine status
        let status: "paid" | "partial" | "unpaid" = "unpaid";
        if (remaining <= 0) status = "paid";
        else if (received > 0) status = "partial";

        // Check for problems
        const hasPending = confirmationTransactions.some((t) => t.status === "pending");
        const hasNegativeNet = net < 0;

        return {
          id: c.id,
          code: c.confirmation_code,
          client: c.main_client_name,
          arrivalDate: c.arrival_date,
          days,
          revenue,
          expenses: totalExpenses,
          received,
          remaining,
          net,
          status,
          hasLooseTx: false, // This is checked separately
          hasPending,
          hasNegativeNet,
          transactions: confirmationTransactions,
          mealsExpense: actualMealsExpense,
          mealsNights,
        };
      })
      .filter((c) => c.revenue > 0); // Only show bookings with revenue
  }, [confirmations, transactions, expenses, dateFrom, dateTo, searchQuery, exchangeRate]);

  // Apply problem filter
  const filteredBookings = useMemo(() => {
    let filtered = bookingRows;

    if (onlyProblems) {
      filtered = filtered.filter(
        (b) => b.status !== "paid" || b.hasPending || b.hasNegativeNet
      );
    }

    if (problemFilter === "unpaid") {
      filtered = filtered.filter((b) => b.status === "unpaid" || b.status === "partial");
    } else if (problemFilter === "pending") {
      filtered = filtered.filter((b) => b.hasPending);
    } else if (problemFilter === "negative") {
      filtered = filtered.filter((b) => b.hasNegativeNet);
    }

    return filtered;
  }, [bookingRows, problemFilter, onlyProblems]);

  // Problem counts for fix bar
  const problemCounts = useMemo(() => {
    return {
      loose: looseTransactions.length,
      unpaid: bookingRows.filter((b) => b.status === "unpaid" || b.status === "partial").length,
      pending: bookingRows.filter((b) => b.hasPending).length,
      negative: bookingRows.filter((b) => b.hasNegativeNet).length,
    };
  }, [bookingRows, looseTransactions]);

  // KPI summary
  const kpiData = useMemo(() => {
    const received = bookingRows.reduce((sum, b) => sum + b.received, 0);
    const expenses = bookingRows.reduce((sum, b) => sum + b.expenses, 0);
    const profit = received - expenses;
    const pending = bookingRows.reduce((sum, b) => sum + b.remaining, 0);

    return {
      received,
      expenses,
      profit,
      pending,
      bookingsCount: bookingRows.length,
      transactionsCount: transactions?.length || 0,
    };
  }, [bookingRows, transactions]);

  // Auto-create meals transactions
  useEffect(() => {
    if (!confirmations || !transactions || isLoading) return;

    const missingMealsTransactions = confirmations
      .filter((c: any) => {
        if (createdMealsRef.current.has(c.id)) return false;

        if (dateFrom || dateTo) {
          const arrivalDate = parseConfirmationDate(c.arrival_date);
          if (!arrivalDate) return false;
          if (dateFrom && arrivalDate < dateFrom) return false;
          if (dateTo && arrivalDate > dateTo) return false;
        }

        const { mealsExpense, mealsNights } = calculateMealsFromPayload(c.raw_payload);
        if (mealsNights <= 0 || mealsExpense <= 0) return false;

        const hasMeals = transactions.some(
          (t) => t.confirmation_id === c.id && t.category === "breakfast"
        );
        return !hasMeals;
      })
      .map((c: any) => {
        const { mealsExpense, mealsNights, numAdults } = calculateMealsFromPayload(c.raw_payload);
        return {
          date: isoDateFromDdMmYyyy(c.arrival_date),
          kind: "out" as const,
          status: "confirmed" as const,
          category: "breakfast" as const,
          description: `Meals - ${mealsNights} nights (${numAdults} adults)`,
          amount: mealsExpense,
          is_auto_generated: true,
          confirmation_id: c.id,
          payment_method: null,
          notes: "Auto-generated meals expense (GEL)",
        };
      });

    if (missingMealsTransactions.length > 0) {
      missingMealsTransactions.forEach((t) => {
        if (t.confirmation_id) createdMealsRef.current.add(t.confirmation_id);
      });
      bulkCreateTransactions.mutate(missingMealsTransactions);
    }
  }, [confirmations, transactions, isLoading, bulkCreateTransactions, dateFrom, dateTo]);

  return {
    bookings: filteredBookings,
    allBookings: bookingRows,
    looseTransactions,
    problemCounts,
    kpiData,
    isLoading,
    confirmations,
  };
}
