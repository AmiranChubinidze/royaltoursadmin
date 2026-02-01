import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewAs } from "@/contexts/ViewAsContext";

interface BookingRouteProps {
  children: React.ReactNode;
}

export function BookingRoute({ children }: BookingRouteProps) {
  const { role, isLoading: loading } = useUserRole();
  const { viewAsRole } = useViewAs();
  const navigate = useNavigate();

  const effectiveRole = viewAsRole || role;
  const hasAccess = effectiveRole === "admin" || effectiveRole === "worker" || effectiveRole === "accountant" || effectiveRole === "coworker";

  useEffect(() => {
    if (!loading && !hasAccess) {
      navigate("/");
    }
  }, [loading, hasAccess, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
