import { Transaction } from "@/hooks/useTransactions";

export interface BookingRow {
  id: string;
  code: string;
  client: string | null;
  arrivalDate: string | null;
  days: number;
  revenue: number;
  expenses: number;
  received: number;
  remaining: number;
  net: number;
  status: "paid" | "partial" | "unpaid";
  hasLooseTx: boolean;
  hasPending: boolean;
  hasNegativeNet: boolean;
  transactions: Transaction[];
  mealsExpense: number;
  mealsNights: number;
}

export interface LooseTransaction extends Transaction {
  suggestedBooking?: {
    code: string;
    id: string;
    confidence: number;
  } | null;
}

export type ProblemFilter = "loose" | "unpaid" | "pending" | "negative" | null;
