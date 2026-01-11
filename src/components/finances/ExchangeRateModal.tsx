import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface ExchangeRateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExchangeRateModal({ open, onOpenChange }: ExchangeRateModalProps) {
  const { exchangeRate, updateExchangeRate, isLoading } = useCurrency();
  const [isPending, setIsPending] = useState(false);
  
  const [gelToUsd, setGelToUsd] = useState("");
  const [usdToGel, setUsdToGel] = useState("");

  useEffect(() => {
    if (exchangeRate) {
      setGelToUsd(exchangeRate.gel_to_usd.toString());
      setUsdToGel(exchangeRate.usd_to_gel.toString());
    }
  }, [exchangeRate]);

  const handleSave = async () => {
    const gel = parseFloat(gelToUsd);
    const usd = parseFloat(usdToGel);
    
    if (isNaN(gel) || isNaN(usd) || gel <= 0 || usd <= 0) {
      toast.error("Please enter valid exchange rates");
      return;
    }

    try {
      setIsPending(true);
      await updateExchangeRate({ gel_to_usd: gel, usd_to_gel: usd });
      toast.success("Exchange rate updated");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update exchange rate");
    } finally {
      setIsPending(false);
    }
  };

  const syncRates = () => {
    const gel = parseFloat(gelToUsd);
    if (!isNaN(gel) && gel > 0) {
      setUsdToGel((1 / gel).toFixed(2));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exchange Rate Settings</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gel-to-usd">1 GEL = ? USD</Label>
              <Input
                id="gel-to-usd"
                type="number"
                step="0.01"
                value={gelToUsd}
                onChange={(e) => setGelToUsd(e.target.value)}
                placeholder="0.36"
              />
            </div>
            
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={syncRates} className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Sync inverse
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="usd-to-gel">1 USD = ? GEL</Label>
              <Input
                id="usd-to-gel"
                type="number"
                step="0.01"
                value={usdToGel}
                onChange={(e) => setUsdToGel(e.target.value)}
                placeholder="2.78"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isPending} className="flex-1">
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
