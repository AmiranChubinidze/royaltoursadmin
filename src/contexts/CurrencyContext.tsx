import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Currency = "USD" | "GEL";

interface ExchangeRateData {
  gel_to_usd: number;
  usd_to_gel: number;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (amount: number, showSign?: boolean) => string;
  convertAmount: (amount: number) => number;
  symbol: string;
  exchangeRate: ExchangeRateData;
  updateExchangeRate: (rate: ExchangeRateData) => Promise<void>;
  baseCurrency: Currency;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  GEL: "₾",
};

const DEFAULT_EXCHANGE_RATE: ExchangeRateData = {
  gel_to_usd: 0.36,
  usd_to_gel: 2.78,
};

const BASE_CURRENCY: Currency = "USD";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("preferred-currency");
    return (saved as Currency) || "USD";
  });

  const { data: exchangeRate = DEFAULT_EXCHANGE_RATE, isLoading } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: async (): Promise<ExchangeRateData> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "exchange_rate")
        .maybeSingle();

      if (error || !data) {
        console.error("Failed to fetch exchange rate:", error);
        return DEFAULT_EXCHANGE_RATE;
      }

      const value = data.value as unknown as ExchangeRateData;
      return value;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    localStorage.setItem("preferred-currency", currency);
  }, [currency]);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  const updateExchangeRate = async (rate: ExchangeRateData) => {
    const { data: user } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("app_settings")
      .update({
        value: JSON.parse(JSON.stringify(rate)),
        updated_at: new Date().toISOString(),
        updated_by: user.user?.id,
      })
      .eq("key", "exchange_rate");

    if (error) throw error;
    
    queryClient.invalidateQueries({ queryKey: ["exchange-rate"] });
  };

  const symbol = CURRENCY_SYMBOLS[currency];

  const convertAmount = (amount: number): number => {
    if (currency === BASE_CURRENCY) {
      return amount;
    }
    return amount * exchangeRate.usd_to_gel;
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
        updateExchangeRate,
        baseCurrency: BASE_CURRENCY,
        isLoading,
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
