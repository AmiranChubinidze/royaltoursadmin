import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useMyHolderBalance } from "@/hooks/useHolders";
import { useQuery } from "@tanstack/react-query";
import { useViewAs } from "@/contexts/ViewAsContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  FileText,
  Plus,
  Mail,
  Database,
  DollarSign,
  CalendarDays,
  Shield,
  LogOut,
  Eye,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import rtgLogoFull from "@/assets/rtg-logo-full.png";

const roleLabel = (r: string) =>
  r === "worker"
    ? "Manager"
    : r === "coworker"
    ? "Coworker"
    : r === "accountant"
    ? "Accountant"
    : r;

export function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isAccountant, isWorker, isCoworker, canEdit, role } = useUserRole();
  const { viewAsRole, setViewAsRole } = useViewAs();
  const { setOpenMobile } = useSidebar();
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  const displayName = profile?.display_name?.trim() || user?.email || "User";
  const { data: myBalance } = useMyHolderBalance(user?.id);

  const effectiveRole = viewAsRole || role;
  const effectiveCanEdit = viewAsRole
    ? ["admin", "worker", "accountant", "coworker"].includes(viewAsRole)
    : canEdit;
  const effectiveIsBooking = viewAsRole
    ? viewAsRole === "accountant"
    : role === "accountant";
  const effectiveIsAdmin = effectiveRole === "admin";
  const effectiveCanSeeFinances = effectiveRole
    ? ["admin", "worker", "accountant", "coworker"].includes(effectiveRole)
    : isAdmin || isAccountant || isWorker || isCoworker;

  const go = (path: string) => {
    setOpenMobile(false);
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const navItemClass = (path: string) =>
    `relative flex h-[36px] items-center gap-2 rounded-[10px] px-2.5 text-[14px] font-medium transition-all duration-[140ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f1fbfb] [&_svg]:h-[18px] [&_svg]:w-[18px] ${
      isActive(path)
        ? "bg-[rgba(15,118,110,0.16)] text-[#0F172A] font-semibold shadow-[inset_3px_0_0_#0F766E] [&_svg]:text-[#0F766E]"
        : "text-[#0F172A] [&_svg]:text-[#3C6F6A] hover:bg-[rgba(15,118,110,0.08)] hover:translate-x-[1px]"
    }`;

  const formatBalance = (value: number, symbol: string) => {
    const sign = value < 0 ? "−" : "";
    const formatted = Math.abs(Math.round(value)).toLocaleString();
    return `${sign}${symbol}${formatted}`;
  };

  return (
    <Sidebar className="border-r border-[#D9EBE8] bg-[linear-gradient(180deg,#f1fbfb_0%,#e6f4f2_100%)]">
      {/* Header — logo + brand */}
      <SidebarHeader className="h-12 px-4 bg-transparent">
        <div
          className="flex h-full items-center gap-0 cursor-pointer"
          onClick={() => go("/")}
        >
          <img
            src={rtgLogoFull}
            alt="RGT"
            className="h-11 w-11 object-contain block flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-display font-semibold text-[16px] leading-none text-[#0F172A] tracking-[-0.01em] whitespace-nowrap m-0">
              Royal Georgian Tours
            </span>
          </div>
        </div>
      </SidebarHeader>
      {/* Navigation */}
      <SidebarContent className="bg-transparent px-4 pt-2 pb-4 space-y-3">
        {/* Confirmations */}
        <SidebarGroup className="rounded-[14px] border border-[rgba(15,118,110,0.14)] bg-white/95 px-2.5 py-2 shadow-[0_4px_12px_rgba(15,118,110,0.08)]">
          <SidebarGroupLabel className="uppercase tracking-[0.08em] text-[11px] text-[#3C6F6A] font-semibold px-2.5 mb-1.5">
            Confirmations
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-0.5">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive("/")}
                  onClick={() => go("/")}
                  tooltip="Dashboard"
                  className={navItemClass("/")}
                >
                  <FileText className="h-[18px] w-[18px]" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive("/calendar")}
                  onClick={() => go("/calendar")}
                  tooltip="Calendar"
                  className={navItemClass("/calendar")}
                >
                  <CalendarDays className="h-[18px] w-[18px]" />
                  <span>Calendar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {effectiveCanEdit && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/new")}
                    onClick={() => go("/new")}
                    tooltip="New Confirmation"
                    className={navItemClass("/new")}
                  >
                    <Plus className="h-[18px] w-[18px]" />
                    <span>New Confirmation</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {(effectiveCanEdit || effectiveIsBooking) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/create-booking-request")}
                    onClick={() => go("/create-booking-request")}
                    tooltip="Booking Request"
                    className={navItemClass("/create-booking-request")}
                  >
                    <Mail className="h-[18px] w-[18px]" />
                    <span>Booking Request</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Data */}
        <SidebarGroup className="rounded-[14px] border border-[rgba(15,118,110,0.14)] bg-white/95 px-2.5 py-2 shadow-[0_4px_12px_rgba(15,118,110,0.08)]">
          <SidebarGroupLabel className="uppercase tracking-[0.08em] text-[11px] text-[#3C6F6A] font-semibold px-2.5 mb-1.5">
            Data
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-0.5">
            <SidebarMenu>
              {effectiveCanEdit && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/saved-data")}
                    onClick={() => go("/saved-data")}
                    tooltip="Saved Data"
                    className={navItemClass("/saved-data")}
                  >
                    <Database className="h-[18px] w-[18px]" />
                    <span>Saved Data</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {effectiveCanSeeFinances && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/finances")}
                    onClick={() => go("/finances")}
                    tooltip="Finances"
                    className={navItemClass("/finances")}
                  >
                    <DollarSign className="h-[18px] w-[18px]" />
                    <span>Finances</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        {effectiveIsAdmin && (
          <SidebarGroup className="rounded-[14px] border border-[rgba(15,118,110,0.14)] bg-white/95 px-2.5 py-2 shadow-[0_4px_12px_rgba(15,118,110,0.08)]">
            <SidebarGroupLabel className="uppercase tracking-[0.08em] text-[11px] text-[#3C6F6A] font-semibold px-2.5 mb-1.5">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent className="space-y-0.5">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/admin")}
                    onClick={() => go("/admin")}
                    tooltip="Admin Panel"
                    className={navItemClass("/admin")}
                  >
                    <Shield className="h-[18px] w-[18px]" />
                    <span>Admin Panel</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-4 pb-2 pt-1 border-t border-[#D9EBE8] bg-transparent">
        {/* User info */}
        <div className="w-full relative">
          <button
            type="button"
            onClick={() => setIsUserPanelOpen((open) => !open)}
            className="flex w-full items-center gap-2 rounded-[12px] border border-[rgba(15,118,110,0.18)] bg-white px-3 py-2 text-left transition duration-150 hover:border-[#0F766E]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f1fbfb]"
            aria-expanded={isUserPanelOpen}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-[#0F766E] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[12px] text-[#0F172A] truncate min-w-0 max-w-[9.5rem] flex-1">
                  {displayName}
                </span>
                {role && displayName?.trim().toLowerCase() !== roleLabel(role).toLowerCase() && (
                  <Badge
                    variant={
                      role === "admin"
                        ? "default"
                        : role === "worker" || role === "accountant"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-[9px] capitalize shrink-0"
                  >
                    {roleLabel(role)}
                  </Badge>
                )}
              </div>
              <div className="text-[10px] text-[#3C6F6A] truncate">
                {myBalance
                  ? `${formatBalance(myBalance.balanceUSD, "$")} / ${formatBalance(myBalance.balanceGEL, "₾")}`
                  : "No linked holder"}
              </div>
            </div>
            <span className="ml-auto flex h-5.5 w-5.5 items-center justify-center rounded-full border border-[rgba(15,118,110,0.18)] bg-white text-[#3C6F6A]">
              {isUserPanelOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </span>
          </button>

          <div
            className={`absolute left-0 right-0 bottom-[calc(100%+8px)] z-10 transition-[opacity,transform] duration-200 ease-out ${
              isUserPanelOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <div className="rounded-xl border border-[rgba(15,118,110,0.18)] bg-white/95 p-2.5 shadow-[0_12px_24px_rgba(15,118,110,0.12)]">
              <div className="text-[10px] text-[#3C6F6A] truncate">{user?.email || "—"}</div>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-[rgba(15,118,110,0.18)] bg-white px-2.5 py-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-[#3C6F6A]">
                  Balance
                </span>
                <span className="text-[11px] font-semibold text-[#0F172A]">
                  {myBalance
                    ? `${formatBalance(myBalance.balanceUSD, "$")} / ${formatBalance(myBalance.balanceGEL, "₾")}`
                    : "No linked holder"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full rounded-lg border-[rgba(15,118,110,0.18)] text-[#0F172A] hover:bg-[#0F766E]/10"
                onClick={signOut}
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Sign Out
              </Button>
              {isAdmin && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full rounded-lg border-[rgba(15,118,110,0.18)] text-[#0F172A] hover:bg-[#0F766E]/10"
                      title={viewAsRole ? `Viewing as ${viewAsRole}` : "View as..."}
                    >
                      <Eye className="h-3.5 w-3.5 mr-2" />
                      View As
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1" side="top" align="start">
                    <div className="space-y-0.5">
                      <Button
                        variant={viewAsRole === null ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-sm"
                        onClick={() => setViewAsRole(null)}
                      >
                        My Role ({roleLabel(role || "")})
                      </Button>
                      {(["worker", "coworker", "accountant", "visitor"] as const).map((r) => (
                        <Button
                          key={r}
                          variant={viewAsRole === r ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() => setViewAsRole(r)}
                        >
                          {roleLabel(r)}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </div>

        {viewAsRole && (
          <Badge variant="outline" className="text-[9px] w-fit">
            Viewing as {roleLabel(viewAsRole)}
          </Badge>
        )}

        <div className="flex items-center gap-1"></div>
      </SidebarFooter>
    </Sidebar>
  );
}


