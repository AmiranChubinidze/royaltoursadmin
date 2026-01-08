import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Currency = "USD" | "GEL";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (amount: number, showSign?: boolean) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  GEL: "₾",
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("preferred-currency");
    return (saved as Currency) || "USD";
  });

  useEffect(() => {
    localStorage.setItem("preferred-currency", currency);
  }, [currency]);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  const symbol = CURRENCY_SYMBOLS[currency];

  const formatAmount = (amount: number, showSign = false): string => {
    const formatted = amount.toLocaleString();
    const prefix = showSign && amount > 0 ? "+" : showSign && amount < 0 ? "-" : "";
    const absFormatted = showSign ? Math.abs(amount).toLocaleString() : formatted;
    return `${prefix}${symbol}${absFormatted}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
