import { Button } from "@/components/ui/button";
import { useCurrency, Currency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

interface CurrencyToggleProps {
  className?: string;
  size?: "sm" | "default";
}

export function CurrencyToggle({ className, size = "sm" }: CurrencyToggleProps) {
  const { currency, setCurrency } = useCurrency();

  const toggle = () => {
    setCurrency(currency === "USD" ? "GEL" : "USD");
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggle}
      className={cn("font-mono min-w-[60px]", className)}
    >
      {currency === "USD" ? "$ USD" : "₾ GEL"}
    </Button>
  );
}
