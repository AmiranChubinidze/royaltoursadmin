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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutGrid,
  Calendar,
  Plus,
  Inbox,
  Database,
  Wallet,
  Shield,
  LogOut,
  Eye,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

  const NavIcon = ({ icon: Icon }: { icon: LucideIcon }) => {
    return (
      <span className="nav-icon" aria-hidden="true">
        <Icon strokeWidth={1.9} />
      </span>
    );
  };

  const navItemClass = (path: string) =>
    `group relative flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13.5px] font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f1fbfb] group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 [&_.nav-icon]:inline-flex [&_.nav-icon]:h-7 [&_.nav-icon]:w-7 [&_.nav-icon]:items-center [&_.nav-icon]:justify-center [&_.nav-icon]:rounded-[10px] [&_.nav-icon]:border [&_.nav-icon]:border-[#D9EBE8] [&_.nav-icon]:bg-[#F5FEFD] [&_.nav-icon]:shadow-[0_1px_2px_rgba(17,24,39,0.06)] [&_.nav-icon>svg]:h-[16px] [&_.nav-icon>svg]:w-[16px] [&_.nav-icon>svg]:text-[#3C6F6A] ${
      isActive(path)
        ? "bg-[#E6FBF7] text-[#1F2937] font-semibold shadow-[inset_3px_0_0_#0F766E] [&_.nav-icon]:bg-[#DDF3F1] [&_.nav-icon]:border-[#BFE7E0] [&_.nav-icon>svg]:text-[#0F766E]"
        : "text-[#1F2937] hover:bg-[#F0FBFA] hover:[&_.nav-icon]:bg-white"
    }`;

  const formatBalance = (value: number, symbol: string) => {
    const sign = value < 0 ? "−" : "";
    const formatted = Math.abs(Math.round(value)).toLocaleString();
    return `${sign}${symbol}${formatted}`;
  };

  return (
    <Sidebar
      collapsible="icon"
      style={{ "--sidebar-width-icon": "4.25rem" } as any}
      className="border-r border-[#E6E5EE] bg-[linear-gradient(180deg,#F8F7FB_0%,#F3F2F8_100%)]"
    >
      {/* Header — logo + brand */}
      <SidebarHeader className="relative h-[84px] px-3 py-3 bg-transparent group-data-[collapsible=icon]:h-[96px] group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
        <div className="flex h-full w-full items-center gap-1.5 pr-7 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:pr-0">
          <button
            type="button"
            onClick={() => go("/")}
            className="flex flex-1 items-center gap-0.5 min-w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
          >
            <img
              src={rtgLogoFull}
              alt="RGT"
              className="h-[60px] w-[60px] object-contain block flex-shrink-0 drop-shadow-[0_4px_18px_rgba(17,24,39,0.18)] group-data-[collapsible=icon]:h-[52px] group-data-[collapsible=icon]:w-[52px]"
            />
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="font-display font-semibold text-[15px] leading-none text-[#111827] tracking-[-0.02em] whitespace-nowrap m-0">
                Royal Georgian Tours
              </span>
            </div>
          </button>
          <SidebarTrigger className="hidden h-5 w-5 rounded-md border-0 bg-transparent p-0 text-[#8A92A6] shadow-none hover:bg-transparent hover:text-[#111827] [&>svg]:h-4 [&>svg]:w-4 group-data-[collapsible=icon]:inline-flex" />
        </div>

        <SidebarTrigger className="absolute right-2 top-2 h-5 w-5 rounded-md border-0 bg-transparent p-0 text-[#8A92A6] shadow-none hover:bg-transparent hover:text-[#111827] [&>svg]:h-4 [&>svg]:w-4 group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      {/* Navigation */}
      <SidebarContent className="bg-transparent px-4 pt-2 pb-4 space-y-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:space-y-2">
        {/* Confirmations */}
        <SidebarGroup className="rounded-2xl border border-[#ECEBF4] bg-white/90 px-2.5 py-2 shadow-[0_2px_6px_rgba(17,24,39,0.05)] group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-1.5">
          <SidebarGroupLabel className="uppercase tracking-[0.14em] text-[11px] text-[#8A92A6] font-semibold px-2.5 mb-1.5">
            Confirmations
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-0.5 flex flex-col group-data-[collapsible=icon]:items-center">
            <SidebarMenu className="group-data-[collapsible=icon]:w-auto">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive("/")}
                  onClick={() => go("/")}
                  tooltip="Dashboard"
                  className={navItemClass("/")}
                >
                  <NavIcon icon={LayoutGrid} />
                  <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive("/calendar")}
                  onClick={() => go("/calendar")}
                  tooltip="Calendar"
                  className={navItemClass("/calendar")}
                >
                  <NavIcon icon={Calendar} />
                  <span className="group-data-[collapsible=icon]:hidden">Calendar</span>
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
                    <NavIcon icon={Plus} />
                    <span className="group-data-[collapsible=icon]:hidden">New Confirmation</span>
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
                    <NavIcon icon={Inbox} />
                    <span className="group-data-[collapsible=icon]:hidden">Booking Request</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Data */}
        <SidebarGroup className="rounded-2xl border border-[#ECEBF4] bg-white/90 px-2.5 py-2 shadow-[0_2px_6px_rgba(17,24,39,0.05)] group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-1.5">
          <SidebarGroupLabel className="uppercase tracking-[0.14em] text-[11px] text-[#8A92A6] font-semibold px-2.5 mb-1.5">
            Data
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-0.5 flex flex-col group-data-[collapsible=icon]:items-center">
            <SidebarMenu className="group-data-[collapsible=icon]:w-auto">
              {effectiveCanEdit && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/saved-data")}
                    onClick={() => go("/saved-data")}
                    tooltip="Saved Data"
                    className={navItemClass("/saved-data")}
                  >
                    <NavIcon icon={Database} />
                    <span className="group-data-[collapsible=icon]:hidden">Saved Data</span>
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
                    <NavIcon icon={Wallet} />
                    <span className="group-data-[collapsible=icon]:hidden">Finances</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        {effectiveIsAdmin && (
          <SidebarGroup className="rounded-2xl border border-[#ECEBF4] bg-white/90 px-2.5 py-2 shadow-[0_2px_6px_rgba(17,24,39,0.05)] group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-1.5">
            <SidebarGroupLabel className="uppercase tracking-[0.14em] text-[11px] text-[#8A92A6] font-semibold px-2.5 mb-1.5">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent className="space-y-0.5 flex flex-col group-data-[collapsible=icon]:items-center">
              <SidebarMenu className="group-data-[collapsible=icon]:w-auto">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/admin")}
                    onClick={() => go("/admin")}
                    tooltip="Admin Panel"
                    className={navItemClass("/admin")}
                  >
                    <NavIcon icon={Shield} />
                    <span className="group-data-[collapsible=icon]:hidden">Admin Panel</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-4 pb-2 pt-1 border-t border-[#E6E5EE] bg-transparent group-data-[collapsible=icon]:hidden">
        {/* User info */}
        <div className="w-full relative">
          <button
            type="button"
            onClick={() => setIsUserPanelOpen((open) => !open)}
            className="flex w-full items-center gap-2 rounded-[12px] border border-[#ECEBF4] bg-white px-3 py-2 text-left transition duration-150 hover:border-[#0F766E]/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f1fbfb]"
            aria-expanded={isUserPanelOpen}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-[#0F766E] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[12px] text-[#111827] truncate min-w-0 max-w-[9.5rem] flex-1">
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
              <div className="text-[10px] text-[#8A92A6] truncate">
                {myBalance
                  ? `${formatBalance(myBalance.balanceUSD, "$")} / ${formatBalance(myBalance.balanceGEL, "₾")}`
                  : "No linked holder"}
              </div>
            </div>
            <span className="ml-auto flex h-5.5 w-5.5 items-center justify-center rounded-full border border-[#ECEBF4] bg-white text-[#8A92A6]">
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
            <div className="rounded-xl border border-[#ECEBF4] bg-white/95 p-2.5 shadow-[0_10px_20px_rgba(17,24,39,0.10)]">
              <div className="text-[10px] text-[#8A92A6] truncate">{user?.email || "—"}</div>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-[#ECEBF4] bg-white px-2.5 py-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-[#8A92A6]">
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
                className="mt-2 w-full rounded-lg border-[#ECEBF4] text-[#111827] hover:bg-[#0F766E]/10"
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
                      className="mt-2 w-full rounded-lg border-[#ECEBF4] text-[#111827] hover:bg-[#0F766E]/10"
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



