import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ViewAsProvider } from "@/contexts/ViewAsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import rtgLogoFull from "@/assets/rtg-logo-full.png";

export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <ViewAsProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Mobile top bar */}
          {isMobile && (
            <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 shadow-sm">
              <SidebarTrigger className="h-8 w-8" />
              <img src={rtgLogoFull} alt="RGT" className="h-7 w-auto" />
              <span className="font-display text-sm font-semibold text-foreground tracking-tight">
                Royal Georgian Tours
              </span>
            </header>
          )}
          <main className="flex-1 p-4 md:p-6 min-h-screen">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ViewAsProvider>
  );
}
