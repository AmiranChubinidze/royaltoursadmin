import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewAs } from "@/contexts/ViewAsContext";

interface AccountantRouteProps {
  children: ReactNode;
}

export function AccountantRoute({ children }: AccountantRouteProps) {
  const { role, isLoading } = useUserRole();
  const { viewAsRole } = useViewAs();
  const effectiveRole = viewAsRole || role;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Allow admin, accountant, coworker, and worker roles
  if (!["admin", "accountant", "worker", "coworker"].includes(effectiveRole || "")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
