import { forwardRef, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullProgress: number;
  isRefreshing: boolean;
  pullDistance: number;
}

export function PullToRefreshIndicator({
  pullProgress,
  isRefreshing,
  pullDistance,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="flex items-center justify-center py-4 transition-all duration-200"
      style={{
        height: isRefreshing ? 48 : Math.max(pullDistance, 0),
        opacity: isRefreshing ? 1 : pullProgress,
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full bg-primary/10",
          isRefreshing && "animate-spin"
        )}
        style={{
          transform: isRefreshing ? "rotate(0deg)" : `rotate(${pullProgress * 360}deg)`,
        }}
      >
        <Loader2 className="h-4 w-4 text-primary" />
      </div>
      {!isRefreshing && pullProgress >= 1 && (
        <span className="ml-2 text-sm text-muted-foreground">Release to refresh</span>
      )}
    </div>
  );
}

interface PullToRefreshContainerProps {
  children: ReactNode;
  className?: string;
}

export const PullToRefreshContainer = forwardRef<
  HTMLDivElement,
  PullToRefreshContainerProps
>(({ children, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("overflow-y-auto overscroll-contain", className)}
    >
      {children}
    </div>
  );
});

PullToRefreshContainer.displayName = "PullToRefreshContainer";
