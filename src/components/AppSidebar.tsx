import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
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
  Shield,
  LogOut,
  Eye,
} from "lucide-react";
import rtgLogoFull from "@/assets/rtg-logo-full.png";

const roleLabel = (r: string) =>
  r === "worker" ? "Manager" : r === "accountant" ? "Coworker" : r;

export function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isAccountant, isWorker, canEdit, role } = useUserRole();
  const { viewAsRole, setViewAsRole } = useViewAs();
  const { setOpenMobile } = useSidebar();
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
      return data as { display_name: string | null } | null;
    },
    enabled: !!user?.id,
  });
  const displayName = profile?.display_name?.trim() || user?.email || "User";

  const effectiveCanEdit = viewAsRole
    ? viewAsRole === "admin" || viewAsRole === "worker"
    : canEdit;
  const effectiveIsBooking = viewAsRole
    ? viewAsRole === "accountant"
    : role === "accountant";

  const go = (path: string) => {
    setOpenMobile(false);
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const navItemClass = (path: string) =>
    `rounded-md px-2.5 py-1.5 text-[13px] transition-all duration-150 relative [&_svg]:h-[18px] [&_svg]:w-[18px] ${
      isActive(path)
        ? "bg-[#EAF3F4] text-[#0F4C5C] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-6 before:rounded-r-full before:bg-[#0F4C5C] [&_svg]:text-[#0F4C5C]"
        : "[&_svg]:text-[#6B7280]"
    }`;

  return (
    <Sidebar>
      {/* Header — logo + brand */}
      <SidebarHeader className="px-4 pt-5 pb-4">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => go("/")}
        >
          <img
            src={rtgLogoFull}
            alt="RGT"
            className="h-10 w-auto transition-transform duration-300 group-hover:scale-[1.03] flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-display font-semibold text-[13.5px] leading-none text-sidebar-accent-foreground tracking-[-0.015em] whitespace-nowrap">
              Royal Georgian Tours
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 mt-1">
        {/* Confirmations */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-[0.02em] text-[11px] text-[#9CA3AF] font-medium px-2 mb-1.5 mt-3">
            Confirmations
          </SidebarGroupLabel>
          <SidebarGroupContent>
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
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-[0.02em] text-[11px] text-[#9CA3AF] font-medium px-2 mb-1.5 mt-3">
            Data
          </SidebarGroupLabel>
          <SidebarGroupContent>
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

              {(isAdmin || isAccountant || isWorker) && (
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
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase tracking-[0.02em] text-[11px] text-[#9CA3AF] font-medium px-2 mb-1.5 mt-3">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
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
      <SidebarFooter className="px-4 py-2 space-y-2 border-t border-[#E5E7EB]">
        {/* User info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-white">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[11px] text-sidebar-foreground truncate min-w-0 max-w-[9.5rem] flex-1">
            {displayName}
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
              className="text-[9px] capitalize shrink-0"
            >
              {roleLabel(role)}
            </Badge>
          )}
        </div>

        {viewAsRole && (
          <Badge variant="outline" className="text-[9px] w-fit">
            Viewing as {roleLabel(viewAsRole)}
          </Badge>
        )}

        <div className="flex items-center gap-1">
          {isAdmin && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={viewAsRole ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  title={viewAsRole ? `Viewing as ${viewAsRole}` : "View as..."}
                >
                  <Eye className="h-4 w-4" />
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
                  {(["worker", "visitor", "accountant"] as const).map((r) => (
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

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/40 hover:text-destructive ml-auto"
            onClick={signOut}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
