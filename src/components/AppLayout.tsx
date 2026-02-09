import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ViewAsProvider } from "@/contexts/ViewAsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import rtgLogoFull from "@/assets/rtg-logo-full.png";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <ViewAsProvider>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset>
          {/* Mobile top bar */}
          {isMobile && (
            <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-border/70 bg-white/90 backdrop-blur px-4 py-3 shadow-[0_6px_16px_rgba(15,76,92,0.08)]">
              <SidebarTrigger className="h-8 w-8" />
              <img src={rtgLogoFull} alt="RGT" className="h-9 w-auto" />
              <span className="font-display text-sm font-semibold text-foreground tracking-tight">
                Royal Georgian Tours
              </span>
            </header>
          )}
          <main
            className={
              isMobile
                ? "flex-1 px-4 pt-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] min-h-screen"
                : "flex-1 p-4 md:p-6 min-h-screen"
            }
          >
            <Outlet />
          </main>
          {isMobile && <MobileBottomNav />}
        </SidebarInset>
      </SidebarProvider>
    </ViewAsProvider>
  );
}
