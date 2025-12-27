import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "worker" | "visitor" | "booking";

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async (): Promise<AppRole | null> => {
      if (!user?.id) return null;

      // Check roles in priority order
      const roles: AppRole[] = ["admin", "worker", "visitor", "booking"];

      for (const r of roles) {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: r,
        });

        if (error) {
          console.error(`Error checking ${r} role:`, error);
          continue;
        }

        if (data === true) {
          return r;
        }
      }

      return null;
    },
    enabled: !!user?.id,
  });

  // Important: treat auth-loading as role-loading to avoid false "no permission" redirects
  // when multiple components instantiate auth hooks at slightly different times.
  const isLoading = authLoading || roleLoading;

  const isAdmin = role === "admin";
  const isWorker = role === "worker";
  const isVisitor = role === "visitor";
  const isBooking = role === "booking";
  const canEdit = isAdmin || isWorker;

  return {
    role,
    isLoading,
    isAdmin,
    isWorker,
    isVisitor,
    isBooking,
    canEdit,
  };
};
