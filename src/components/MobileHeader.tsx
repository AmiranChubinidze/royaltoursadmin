import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Plus,
  LogOut,
  Shield,
  DollarSign,
  Mail,
  Database,
  X,
} from "lucide-react";
import rtgLogoFull from "@/assets/rtg-logo-full.png";

interface MobileHeaderProps {
  user: { email?: string } | null;
  role: string | null;
  isAdmin: boolean;
  isAccountant: boolean;
  isWorker: boolean;
  effectiveCanManageConfirmations: boolean;
  effectiveIsBooking: boolean;
  signOut: () => void;
}

export function MobileHeader({
  user,
  role,
  isAdmin,
  isAccountant,
  isWorker,
  effectiveCanManageConfirmations,
  effectiveIsBooking,
  signOut,
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNavigation = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="flex items-center justify-between py-4 px-4 bg-background border-b border-border sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <img src={rtgLogoFull} alt="RTG" className="h-10 w-auto" />
      </div>

      {/* Menu button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left">Menu</SheetTitle>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground truncate">
                {user?.email}
              </span>
              {role && (
                <Badge
                  variant={
                    role === "admin"
                      ? "default"
                      : role === "worker" || role === "accountant"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-xs capitalize flex-shrink-0"
                >
                  {role === "worker" ? "Manager" : role === "accountant" ? "Coworker" : role}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <div className="p-4 space-y-2">
            {effectiveCanManageConfirmations && (
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={() => handleNavigation("/new")}
              >
                <Plus className="h-4 w-4 mr-3" />
                New Confirmation
              </Button>
            )}

            {effectiveIsBooking && !effectiveCanManageConfirmations && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleNavigation("/create-booking-request")}
              >
                <Mail className="h-4 w-4 mr-3" />
                Booking Request
              </Button>
            )}

            {effectiveCanManageConfirmations && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleNavigation("/create-booking-request")}
              >
                <Mail className="h-4 w-4 mr-3" />
                Booking Request
              </Button>
            )}

            {(isAdmin || isAccountant || isWorker) && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleNavigation("/finances")}
              >
                <DollarSign className="h-4 w-4 mr-3" />
                Finances
              </Button>
            )}

            {effectiveCanManageConfirmations && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleNavigation("/saved-data")}
              >
                <Database className="h-4 w-4 mr-3" />
                Saved Data
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleNavigation("/admin")}
              >
                <Shield className="h-4 w-4 mr-3" />
                Admin Panel
              </Button>
            )}

            <div className="pt-4 border-t border-border mt-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
