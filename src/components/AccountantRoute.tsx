import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountantRouteProps {
  children: ReactNode;
}

export function AccountantRoute({ children }: AccountantRouteProps) {
  const { isAdmin, isAccountant, isWorker, isLoading } = useUserRole();

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

  // Allow admin, accountant, and worker roles
  if (!isAdmin && !isAccountant && !isWorker) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
