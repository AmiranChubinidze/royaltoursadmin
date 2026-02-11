import { useState, Fragment } from "react";
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
import { Check, X, Users, Clock, CheckCircle, Ban, Shield, Eye, FileText, DollarSign, Upload, Database, ChevronDown, ChevronRight } from "lucide-react";
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

interface ActivityLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  changes: Record<string, { old?: unknown; new?: unknown }> | Record<string, unknown>;
  performed_by: string | null;
  performed_at: string;
  label: string;
}

const ACTIVITY_PAGE_SIZE = 50;

const TABLE_DISPLAY_NAMES: Record<string, string> = {
  confirmations: "Confirmation",
  transactions: "Transaction",
  expenses: "Expense",
  confirmation_attachments: "Attachment",
};

const formatFieldName = (field: string) =>
  field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "(empty)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

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

  // Activity log state
  const [activityPage, setActivityPage] = useState(0);
  const [activityActionFilter, setActivityActionFilter] = useState("all");
  const [activityTableFilter, setActivityTableFilter] = useState("all");
  const [activityUserFilter, setActivityUserFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-activity-log", activityPage, activityActionFilter, activityTableFilter, activityUserFilter],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("performed_at", { ascending: false })
        .range(0, (activityPage + 1) * ACTIVITY_PAGE_SIZE - 1);

      if (activityActionFilter !== "all") {
        query = query.eq("action", activityActionFilter);
      }
      if (activityTableFilter !== "all") {
        query = query.eq("table_name", activityTableFilter);
      }
      if (activityUserFilter !== "all") {
        query = query.eq("performed_by", activityUserFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ActivityLogEntry[];
    },
    enabled: isAdmin === true,
  });

  const setFilterAndReset = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setActivityPage(0);
    setExpandedRows(new Set());
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Created</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Updated</Badge>;
      case "DELETE":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Deleted</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

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
      // Approve via edge function to confirm email + update profile/role
      const { error: approveError } = await supabase.functions.invoke("user-approval", {
        body: { action: "approve-user", userId, userEmail },
      });
      if (approveError) throw approveError;

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
      const { error } = await supabase.functions.invoke("user-approval", {
        body: { action: "reject-user", userId },
      });
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="page-title text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground">Manage user approvals</p>
            </div>
            <div className="rounded-full border border-[#0F4C5C]/10 bg-white px-4 py-2 text-xs text-muted-foreground">
              {(profiles?.length || 0)} users - {pendingUsers.length} pending
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Users", value: profiles?.length || 0, icon: Users },
            { label: "Pending Approval", value: pendingUsers.length, icon: Clock },
            { label: "Approved", value: approvedUsers.length, icon: CheckCircle },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/80 shadow-[0_10px_24px_rgba(15,76,92,0.08)] p-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-xl bg-[#EAF7F8] border border-[#0F4C5C]/10 flex items-center justify-center shadow-[0_10px_24px_rgba(15,76,92,0.08)]">
                  <s.icon className="h-4 w-4 text-[#0F4C5C]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-[22px] font-semibold tracking-tight text-[#0F4C5C] stat-number">
                    {s.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Role Permissions Matrix */}
        <Card className="mb-6 rounded-2xl border border-[#0F4C5C]/10 bg-white shadow-[0_10px_24px_rgba(15,76,92,0.08)] overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/50">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#0F4C5C]" />
              <span className="text-sm font-semibold text-[#0F4C5C]">Role Permissions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 py-3">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Feature</TableHead>
                    <TableHead className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Admin</TableHead>
                    <TableHead className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Manager</TableHead>
                    <TableHead className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Coworker</TableHead>
                    <TableHead className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Visitor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="hover:bg-[#EAF7F8]/40">
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
                  <TableRow className="hover:bg-[#EAF7F8]/40">
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
                  <TableRow className="hover:bg-[#EAF7F8]/40">
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
                  <TableRow className="hover:bg-[#EAF7F8]/40">
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
                  <TableRow className="hover:bg-[#EAF7F8]/40">
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
                  <TableRow className="hover:bg-[#EAF7F8]/40">
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
        <Card className="mb-6 rounded-2xl border border-[#0F4C5C]/10 bg-white shadow-[0_10px_24px_rgba(15,76,92,0.08)] overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/50">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0F4C5C]" />
              <span className="text-sm font-semibold text-[#0F4C5C]">Pending Approvals</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pendingUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending approvals</p>
            ) : (
              <div className="rounded-xl border border-[#0F4C5C]/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Email</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Requested</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((profile) => (
                      <TableRow key={profile.id} className="hover:bg-[#EAF7F8]/40">
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
                              className="h-9 rounded-xl bg-[#0F4C5C] text-white hover:bg-[#0F4C5C]/90 shadow-[0_10px_24px_rgba(15,76,92,0.16)]"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectMutation.mutate(profile.id)}
                              disabled={rejectMutation.isPending}
                              className="h-9 rounded-xl"
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
        <Card className="rounded-2xl border border-[#0F4C5C]/10 bg-white shadow-[0_10px_24px_rgba(15,76,92,0.08)] overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/50">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#0F4C5C]" />
              <span className="text-sm font-semibold text-[#0F4C5C]">Approved Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : approvedUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No approved users yet</p>
            ) : (
              <div className="rounded-xl border border-[#0F4C5C]/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Email</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Joined</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Role</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedUsers.map((profile) => {
                      const currentRole = getUserRole(profile.id);
                      const isCurrentUser = profile.id === user?.id;
                      
                      return (
                        <TableRow key={profile.id} className="hover:bg-[#EAF7F8]/40">
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
                                className="h-9 rounded-xl border-[#0F4C5C]/15 text-destructive hover:text-destructive hover:bg-[#EAF7F8]"
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
        <Card className="mt-6 rounded-2xl border border-[#0F4C5C]/10 bg-white shadow-[0_10px_24px_rgba(15,76,92,0.08)] overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/50">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0F4C5C]" />
              <span className="text-sm font-semibold text-[#0F4C5C]">Activity Log</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={activityActionFilter} onValueChange={setFilterAndReset(setActivityActionFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Created</SelectItem>
                  <SelectItem value="UPDATE">Updated</SelectItem>
                  <SelectItem value="DELETE">Deleted</SelectItem>
                </SelectContent>
              </Select>

              <Select value={activityTableFilter} onValueChange={setFilterAndReset(setActivityTableFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="confirmations">Confirmations</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="expenses">Expenses</SelectItem>
                  <SelectItem value="confirmation_attachments">Attachments</SelectItem>
                </SelectContent>
              </Select>

              <Select value={activityUserFilter} onValueChange={setFilterAndReset(setActivityUserFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {(profiles || [])
                    .filter((p) => p.approved)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name?.trim() || p.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {activityLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !activityData || activityData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No activity found</p>
            ) : (
              <>
                <div className="rounded-xl border border-[#0F4C5C]/10 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">When</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Item</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Action</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityData.map((item) => {
                        const isExpanded = expandedRows.has(item.id);
                        const hasChanges = item.changes && Object.keys(item.changes).length > 0;
                        const labelSuffix = item.label.replace(/^(Created|Updated|Deleted)\s+/, "");

                        return (
                          <Fragment key={item.id}>
                            <TableRow
                              className="hover:bg-[#EAF7F8]/40 cursor-pointer"
                              onClick={() => hasChanges && toggleRowExpanded(item.id)}
                            >
                              <TableCell className="w-8 px-2">
                                {hasChanges ? (
                                  isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )
                                ) : null}
                              </TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                {format(new Date(item.performed_at), "MMM d, yyyy HH:mm")}
                              </TableCell>
                              <TableCell className="font-medium">
                                <span className="text-[#0F4C5C]">
                                  {TABLE_DISPLAY_NAMES[item.table_name] || item.table_name}
                                </span>
                                <span className="text-muted-foreground"> &middot; {labelSuffix}</span>
                              </TableCell>
                              <TableCell>{getActionBadge(item.action)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {item.performed_by ? (profileMap.get(item.performed_by) || item.performed_by) : "\u2014"}
                              </TableCell>
                            </TableRow>

                            {isExpanded && hasChanges && (
                              <TableRow className="bg-[#EAF7F8]/25 hover:bg-[#EAF7F8]/25">
                                <TableCell colSpan={5} className="p-0">
                                  <div className="px-5 py-4 border-t border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/35">
                                    {item.action === "UPDATE" ? (
                                      <div className="space-y-3">
                                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                          Changed fields
                                        </div>
                                        <div className="grid gap-2.5 sm:grid-cols-2">
                                          {Object.entries(
                                            item.changes as Record<string, { old?: unknown; new?: unknown }>
                                          ).map(([field, diff]) => (
                                            <div
                                              key={field}
                                              className="rounded-xl border border-[#0F4C5C]/10 bg-white/95 px-3 py-2.5 shadow-[0_6px_16px_rgba(15,76,92,0.06)]"
                                            >
                                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0F4C5C]/80">
                                                {formatFieldName(field)}
                                              </div>
                                              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                                                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-rose-700 line-through break-all">
                                                  {formatValue(diff.old)}
                                                </span>
                                                <span className="text-muted-foreground">&rarr;</span>
                                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 break-all">
                                                  {formatValue(diff.new)}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                          Details
                                        </div>
                                        <div className="grid gap-2.5 sm:grid-cols-2">
                                          {Object.entries(item.changes as Record<string, unknown>)
                                            .filter(([, v]) => v !== null && v !== undefined && v !== "")
                                            .map(([field, value]) => (
                                              <div
                                                key={field}
                                                className="rounded-xl border border-[#0F4C5C]/10 bg-white/95 px-3 py-2.5 shadow-[0_6px_16px_rgba(15,76,92,0.06)]"
                                              >
                                                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0F4C5C]/80">
                                                  {formatFieldName(field)}
                                                </div>
                                                <div className="text-sm text-foreground break-all">
                                                  {formatValue(value)}
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {activityData.length === (activityPage + 1) * ACTIVITY_PAGE_SIZE && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      className="rounded-xl border-[#0F4C5C]/15 text-[#0F4C5C] hover:bg-[#EAF7F8]"
                      onClick={() => setActivityPage((p) => p + 1)}
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
