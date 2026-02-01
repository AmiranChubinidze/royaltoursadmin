import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Users, Clock, CheckCircle, Ban, Shield, Eye, FileText, DollarSign, Upload, Database } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

type AppRole = "admin" | "worker" | "visitor" | "accountant" | "coworker";

interface Profile {
  id: string;
  email: string;
  approved: boolean;
  created_at: string;
  display_name?: string | null;
}

interface UserRole {
  user_id: string;
  role: AppRole;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user has admin role via database
  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }
      return data === true;
    },
    enabled: !!user?.id,
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, approved, created_at, display_name")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin === true,
  });

  const { data: activity } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const [txRes, confRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, type, category, description, amount, currency, created_at, updated_at, created_by, updated_by")
          .order("updated_at", { ascending: false })
          .limit(50),
        supabase
          .from("confirmations")
          .select("id, confirmation_code, main_client_name, created_at, updated_at, updated_by")
          .order("updated_at", { ascending: false })
          .limit(50),
      ]);

      if (txRes.error) throw txRes.error;
      if (confRes.error) throw confRes.error;

      const txItems = (txRes.data || []).map((t) => ({
        id: `tx-${t.id}`,
        when: t.updated_at || t.created_at,
        kind: "Transaction",
        action: t.updated_at && t.updated_at !== t.created_at ? "Updated" : "Created",
        by: t.updated_by || t.created_by || null,
        label: `${t.type} • ${t.category}${t.amount ? ` • ${t.currency} ${t.amount}` : ""}`,
      }));

      const confItems = (confRes.data || []).map((c) => ({
        id: `conf-${c.id}`,
        when: c.updated_at || c.created_at,
        kind: "Confirmation",
        action: c.updated_at && c.updated_at !== c.created_at ? "Updated" : "Created",
        by: c.updated_by || null,
        label: `${c.confirmation_code}${c.main_client_name ? ` • ${c.main_client_name}` : ""}`,
      }));

      return [...txItems, ...confItems].sort((a, b) => {
        return new Date(b.when).getTime() - new Date(a.when).getTime();
      }).slice(0, 50);
    },
    enabled: isAdmin === true,
  });

  // Fetch all user roles
  const { data: userRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: isAdmin === true,
  });

  // Get role for a specific user
  const getUserRole = (userId: string): AppRole | null => {
    if (!userRoles) return null;
    const userRole = userRoles.find(r => r.user_id === userId);
    return userRole?.role as AppRole || null;
  };

  const approveMutation = useMutation({
    mutationFn: async ({ userId, userEmail }: { userId: string; userEmail: string }) => {
      // Update approval status
      const { error } = await supabase
        .from("profiles")
        .update({ approved: true })
        .eq("id", userId);
      
      if (error) throw error;

      // Assign 'visitor' role to the newly approved user
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "visitor" }, { onConflict: "user_id,role" });

      if (roleError) {
        console.error("Error assigning visitor role:", roleError);
        // Don't fail the approval, just log the error
      }

      // Send notification email to user
      await supabase.functions.invoke("user-approval", {
        body: { action: "notify-approved", userEmail },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast({ title: "User approved", description: "User has been approved and notified via email." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "User rejected", description: "User has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ approved: false })
        .eq("id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "Access revoked", description: "User access has been revoked." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // First delete existing role for this user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      
      // Then insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole as "admin" | "user" | "worker" | "visitor" | "booking" | "accountant" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast({ title: "Role updated", description: "User role has been changed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getRoleBadgeVariant = (role: AppRole | null) => {
    switch (role) {
      case "admin": return "default";
      case "accountant": return "secondary";
      case "coworker": return "secondary";
      case "worker": return "secondary";
      case "visitor": return "outline";
      default: return "outline";
    }
  };

  // Show loading while checking admin status
  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-64 w-96" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
            <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingUsers = profiles?.filter((p) => !p.approved) || [];
  const approvedUsers = profiles?.filter((p) => p.approved) || [];
  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p.display_name?.trim() || p.email])
  );

  return (
    <div className="animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="page-title text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage user approvals</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stat-card">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold stat-number">{profiles?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="stat-card">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold stat-number">{pendingUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="stat-card">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <CheckCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold stat-number">{approvedUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </div>
        </div>

        {/* Role Permissions Matrix */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">Manager</TableHead>
                    <TableHead className="text-center">Coworker</TableHead>
                    <TableHead className="text-center">Visitor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        View Confirmations
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Create/Edit Confirmations
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><X className="h-4 w-4 text-destructive mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        Upload Attachments
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><X className="h-4 w-4 text-destructive mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        Saved Data / Hotels
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><X className="h-4 w-4 text-destructive mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        Finances
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><X className="h-4 w-4 text-destructive mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Admin Panel
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><X className="h-4 w-4 text-destructive mx-auto" /></TableCell>
                    <TableCell className="text-center"><X className="h-4 w-4 text-destructive mx-auto" /></TableCell>
                    <TableCell className="text-center"><X className="h-4 w-4 text-destructive mx-auto" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pending Users */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pendingUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending approvals</p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 border-b border-border">
                      <TableHead>Email</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(profile.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate({ userId: profile.id, userEmail: profile.email })}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectMutation.mutate(profile.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Approved Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : approvedUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No approved users yet</p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 border-b border-border">
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedUsers.map((profile) => {
                      const currentRole = getUserRole(profile.id);
                      const isCurrentUser = profile.id === user?.id;
                      
                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.email}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(profile.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {isCurrentUser ? (
                              <Badge variant={getRoleBadgeVariant(currentRole)}>
                                {currentRole || "No role"}
                              </Badge>
                            ) : (
                              <Select
                                value={currentRole || ""}
                                onValueChange={(value) => 
                                  changeRoleMutation.mutate({ 
                                    userId: profile.id, 
                                    newRole: value as AppRole 
                                  })
                                }
                                disabled={changeRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue placeholder="Select role">
                                    <Badge variant={getRoleBadgeVariant(currentRole)}>
                                      {currentRole === "worker"
                                        ? "Manager"
                                        : currentRole === "coworker"
                                        ? "Coworker"
                                        : currentRole === "accountant"
                                        ? "Accountant"
                                        : (currentRole || "No role")}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="coworker">Coworker</SelectItem>
                                  <SelectItem value="accountant">Accountant</SelectItem>
                                  <SelectItem value="worker">Manager</SelectItem>
                                  <SelectItem value="visitor">Visitor</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isCurrentUser && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => revokeMutation.mutate(profile.id)}
                                disabled={revokeMutation.isPending}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activity ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 border-b border-border">
                      <TableHead>When</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(item.when), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.kind}
                          <span className="text-muted-foreground"> • {item.label}</span>
                        </TableCell>
                        <TableCell>{item.action}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.by ? (profileMap.get(item.by) || item.by) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
