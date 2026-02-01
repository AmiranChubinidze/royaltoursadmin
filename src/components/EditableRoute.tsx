import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import { useViewAs } from "@/contexts/ViewAsContext";

interface EditableRouteProps {
  children: React.ReactNode;
}

export const EditableRoute = ({ children }: EditableRouteProps) => {
  const { canEdit, isLoading } = useUserRole();
  const { viewAsRole } = useViewAs();
  const effectiveCanEdit = viewAsRole
    ? ["admin", "worker", "accountant", "coworker"].includes(viewAsRole)
    : canEdit;
  const { toast } = useToast();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!isLoading && !effectiveCanEdit && !hasShownToast.current) {
      hasShownToast.current = true;
      toast({
        title: "Access Denied",
        description: "You don't have permission to create or edit confirmations. Contact an admin to upgrade your role.",
        variant: "destructive",
      });
    }
  }, [isLoading, effectiveCanEdit, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!effectiveCanEdit) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
