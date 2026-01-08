import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function MobileFinanceHeader() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 py-4 px-4 bg-background border-b border-border sticky top-0 z-50">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div>
        <h1 className="text-lg font-bold text-foreground">Finances</h1>
        <p className="text-xs text-muted-foreground">Income, expenses & profit</p>
      </div>
    </div>
  );
}
