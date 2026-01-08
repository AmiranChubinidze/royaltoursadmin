import { useMemo } from "react";
import { Transaction } from "./useTransactions";
import { HolderWithBalance } from "./useHolders";

export interface FinanceAlert {
  id: string;
  type: "holder_mismatch" | "negative_balance" | "old_pending" | "cash_not_deposited";
  severity: "warning" | "error";
  title: string;
  description: string;
  transactionId?: string;
  holderId?: string;
}

// Payment method to holder type mapping
const PAYMENT_HOLDER_MAPPING: Record<string, string[]> = {
  cash: ["cash"],
  bank: ["bank"],
  online: ["bank"],
  card: ["card"],
  personal: ["cash"],
};

const CASH_THRESHOLD = 500; // GEL
const PENDING_DAYS_THRESHOLD = 7;

export const useFinanceAlerts = (
  transactions: Transaction[] | undefined,
  holders: HolderWithBalance[] | undefined
): FinanceAlert[] => {
  return useMemo(() => {
    const alerts: FinanceAlert[] = [];

    if (!transactions || !holders) return alerts;

    // Check for holder mismatches
    transactions.forEach((tx) => {
      if (tx.kind !== "transfer" && tx.payment_method && tx.holder_id) {
        const holder = holders.find((h) => h.id === tx.holder_id);
        if (holder) {
          const allowedTypes = PAYMENT_HOLDER_MAPPING[tx.payment_method];
          if (allowedTypes && !allowedTypes.includes(holder.type)) {
            alerts.push({
              id: `mismatch-${tx.id}`,
              type: "holder_mismatch",
              severity: "warning",
              title: "Holder Mismatch",
              description: `Transaction uses ${tx.payment_method} payment but holder "${holder.name}" is type "${holder.type}"`,
              transactionId: tx.id,
              holderId: holder.id,
            });
          }
        }
      }
    });

    // Check for negative balances
    holders.forEach((holder) => {
      if (holder.balance < 0) {
        alerts.push({
          id: `negative-${holder.id}`,
          type: "negative_balance",
          severity: "warning",
          title: "Negative Balance",
          description: `${holder.name} has a negative balance of ${holder.balance.toFixed(2)} ${holder.currency}. Missing transfer or wrong holder?`,
          holderId: holder.id,
        });
      }
    });

    // Check for old pending transactions
    const today = new Date();
    transactions.forEach((tx) => {
      if (tx.status === "pending") {
        const txDate = new Date(tx.date);
        const daysDiff = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > PENDING_DAYS_THRESHOLD) {
          alerts.push({
            id: `old-pending-${tx.id}`,
            type: "old_pending",
            severity: "warning",
            title: "Old Pending Transaction",
            description: `Transaction from ${tx.date} has been pending for ${daysDiff} days`,
            transactionId: tx.id,
          });
        }
      }
    });

    // Check for cash not deposited (cash holders with high balance)
    holders.forEach((holder) => {
      if (holder.type === "cash" && holder.balance > CASH_THRESHOLD) {
        // Check if last activity was more than 7 days ago
        if (holder.lastActivity) {
          const lastDate = new Date(holder.lastActivity);
          const daysSinceActivity = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceActivity > PENDING_DAYS_THRESHOLD) {
            alerts.push({
              id: `cash-deposit-${holder.id}`,
              type: "cash_not_deposited",
              severity: "warning",
              title: "Cash Not Deposited",
              description: `${holder.name} has ${holder.balance.toFixed(2)} ${holder.currency} with no activity for ${daysSinceActivity} days. Consider depositing to bank.`,
              holderId: holder.id,
            });
          }
        }
      }
    });

    return alerts;
  }, [transactions, holders]);
};
