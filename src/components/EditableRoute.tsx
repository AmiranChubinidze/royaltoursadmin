import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

interface EditableRouteProps {
  children: React.ReactNode;
}

export const EditableRoute = ({ children }: EditableRouteProps) => {
  const { canEdit, isLoading } = useUserRole();
  const { toast } = useToast();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!isLoading && !canEdit && !hasShownToast.current) {
      hasShownToast.current = true;
      toast({
        title: "Access Denied",
        description: "You don't have permission to create or edit confirmations. Contact an admin to upgrade your role.",
        variant: "destructive",
      });
    }
  }, [isLoading, canEdit, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canEdit) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
