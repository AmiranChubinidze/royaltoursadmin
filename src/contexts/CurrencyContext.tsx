import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Currency = "USD" | "GEL";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (amount: number, showSign?: boolean) => string;
  convertAmount: (amount: number) => number;
  symbol: string;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  baseCurrency: Currency;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  GEL: "₾",
};

// Default exchange rate: 1 USD = 2.73 GEL (approximate)
const DEFAULT_EXCHANGE_RATE = 2.73;

// Base currency for stored amounts (most amounts are stored in USD)
const BASE_CURRENCY: Currency = "USD";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("preferred-currency");
    return (saved as Currency) || "USD";
  });

  const [exchangeRate, setExchangeRateState] = useState<number>(() => {
    const saved = localStorage.getItem("exchange-rate-usd-gel");
    return saved ? parseFloat(saved) : DEFAULT_EXCHANGE_RATE;
  });

  useEffect(() => {
    localStorage.setItem("preferred-currency", currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem("exchange-rate-usd-gel", exchangeRate.toString());
  }, [exchangeRate]);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  const setExchangeRate = (rate: number) => {
    if (rate > 0) {
      setExchangeRateState(rate);
    }
  };

  const symbol = CURRENCY_SYMBOLS[currency];

  // Convert amount from base currency (USD) to display currency
  const convertAmount = (amount: number): number => {
    if (currency === BASE_CURRENCY) {
      return amount;
    }
    // Convert USD to GEL
    return amount * exchangeRate;
  };

  const formatAmount = (amount: number, showSign = false): string => {
    const converted = convertAmount(amount);
    const formatted = Math.round(converted).toLocaleString();
    const prefix = showSign && amount > 0 ? "+" : showSign && amount < 0 ? "-" : "";
    const absFormatted = showSign ? Math.round(Math.abs(converted)).toLocaleString() : formatted;
    return `${prefix}${symbol}${absFormatted}`;
  };

  return (
    <CurrencyContext.Provider 
      value={{ 
        currency, 
        setCurrency, 
        formatAmount, 
        convertAmount,
        symbol, 
        exchangeRate, 
        setExchangeRate,
        baseCurrency: BASE_CURRENCY,
      }}
    >
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
