import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrency, Currency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { Settings2 } from "lucide-react";

interface CurrencyToggleProps {
  className?: string;
  size?: "sm" | "default";
}

export function CurrencyToggle({ className, size = "sm" }: CurrencyToggleProps) {
  const { currency, setCurrency, exchangeRate, setExchangeRate } = useCurrency();
  const [rateInput, setRateInput] = useState(exchangeRate.toString());
  const [isOpen, setIsOpen] = useState(false);

  const handleRateChange = () => {
    const newRate = parseFloat(rateInput);
    if (!isNaN(newRate) && newRate > 0) {
      setExchangeRate(newRate);
    } else {
      setRateInput(exchangeRate.toString());
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Currency selector buttons */}
      <div className="flex rounded-lg border border-input bg-background overflow-hidden">
        <button
          onClick={() => setCurrency("USD")}
          className={cn(
            "px-2.5 py-1.5 text-sm font-medium transition-colors",
            currency === "USD"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          $ USD
        </button>
        <button
          onClick={() => setCurrency("GEL")}
          className={cn(
            "px-2.5 py-1.5 text-sm font-medium transition-colors",
            currency === "GEL"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          ₾ GEL
        </button>
      </div>

      {/* Exchange rate settings */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="end">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Exchange Rate</p>
              <p className="text-xs text-muted-foreground">
                1 USD = ? GEL
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                onBlur={handleRateChange}
                onKeyDown={(e) => e.key === "Enter" && handleRateChange()}
                className="h-8"
              />
              <Button 
                size="sm" 
                className="h-8"
                onClick={() => {
                  handleRateChange();
                  setIsOpen(false);
                }}
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Current: 1 USD = {exchangeRate.toFixed(2)} GEL
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
