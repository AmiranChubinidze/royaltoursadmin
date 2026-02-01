import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, ArrowLeft } from "lucide-react";
import rtgLogoRound from "@/assets/rtg-logo-round.png";

type AuthMode = "login" | "signup" | "forgot-password" | "reset-password";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const publicUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    const hash = window.location.hash || "";
    if (modeParam === "reset" || hash.includes("type=recovery")) {
      setMode("reset-password");
    }
  }, [searchParams]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset-password");
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPendingApproval(false);
    setResetEmailSent(false);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message?.toLowerCase().includes("email") && error.message?.toLowerCase().includes("confirm")) {
            throw new Error("Email not confirmed yet. Please wait for admin approval or check your email.");
          }
          throw error;
        }

        // Check if user is approved
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("approved")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.error("Profile error:", profileError);
          throw new Error("Could not verify account status");
        }

        if (!profile.approved) {
          await supabase.auth.signOut();
          setPendingApproval(true);
          return;
        }

        navigate("/");
      } else if (mode === "signup") {
        const trimmedName = displayName.trim();
        if (!trimmedName) {
          throw new Error("Display name is required.");
        }
        if (trimmedName.length < 2 || trimmedName.length > 24) {
          throw new Error("Display name must be 2-24 characters.");
        }
        if (!/^[A-Za-z0-9_ ]+$/.test(trimmedName)) {
          throw new Error("Display name can use letters, numbers, spaces, and underscores only.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${publicUrl}/`,
          },
        });
        if (error) throw error;

        // Send approval request to admin
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              { id: data.user.id, email, display_name: trimmedName },
              { onConflict: "id" }
            );
          if (profileError) throw profileError;

          await supabase.functions.invoke("user-approval", {
            body: { userEmail: email, userId: data.user.id },
          });
        }

        toast({
          title: "Account created",
          description: "Your account is pending admin approval. You'll be notified when approved.",
        });
        setPendingApproval(true);
        setMode("login");
        setPassword("");
        setEmail("");
      } else if (mode === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${publicUrl}/auth?mode=reset`,
        });
        if (error) throw error;
        setResetEmailSent(true);
        toast({
          title: "Reset email sent",
          description: "Check your email for the password reset link.",
        });
      } else if (mode === "reset-password") {
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast({
          title: "Password updated",
          description: "You can now sign in with your new password.",
        });
        setNewPassword("");
        setConfirmPassword("");
        setSearchParams({});
        setMode("login");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return "Sign in to your account";
      case "signup": return "Create a new account";
      case "forgot-password": return "Reset your password";
      case "reset-password": return "Set a new password";
    }
  };

  const getButtonText = () => {
    if (loading) return "Loading...";
    switch (mode) {
      case "login": return "Sign In";
      case "signup": return "Sign Up";
      case "forgot-password": return "Send Reset Link";
      case "reset-password": return "Update Password";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg p-4 relative">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white rounded-2xl relative overflow-hidden">
        <CardHeader className="text-center space-y-5 pb-2 pt-10">
          <div className="flex justify-center">
            <img
              src={rtgLogoRound}
              alt="Royal Georgian Tours"
              className="h-20 w-auto object-contain drop-shadow-md"
            />
          </div>
          <div>
            <CardTitle className="text-xl font-display font-bold text-foreground tracking-normal">
              Royal Georgian Tours
            </CardTitle>
            <CardDescription className="mt-1.5 text-muted-foreground">{getTitle()}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {pendingApproval && (
            <Alert className="mb-4 border-amber-500 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Your account is pending admin approval. Please wait for approval before signing in.
              </AlertDescription>
            </Alert>
          )}
          {resetEmailSent && (
            <Alert className="mb-4 border-emerald-500 bg-emerald-50">
              <AlertDescription className="text-emerald-800">
                Password reset email sent! Check your inbox and click the link to reset your password.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  maxLength={24}
                  className="border-l-2 border-l-primary/40 focus:border-l-primary"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="border-l-2 border-l-primary/40 focus:border-l-primary"
              />
            </div>
            {mode !== "forgot-password" && mode !== "reset-password" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  className="border-l-2 border-l-primary/40 focus:border-l-primary"
                />
              </div>
            )}
            {mode === "reset-password" && (
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new password"
                  required
                  minLength={6}
                  className="border-l-2 border-l-primary/40 focus:border-l-primary"
                />
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  className="border-l-2 border-l-primary/40 focus:border-l-primary"
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {getButtonText()}
            </Button>
          </form>
          
          <div className="mt-4 space-y-2 text-center">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot-password");
                    setPendingApproval(false);
                    setResetEmailSent(false);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary block w-full"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setPendingApproval(false);
                    setDisplayName("");
                  }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Don't have an account? Sign up
                </button>
              </>
            )}
            {mode === "signup" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setDisplayName("");
                    setPendingApproval(false);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Already have an account? Sign in
              </button>
            )}
            {mode === "forgot-password" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setResetEmailSent(false);
                }}
                className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 w-full"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </button>
            )}
            {mode === "reset-password" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setNewPassword("");
                  setConfirmPassword("");
                  setSearchParams({});
                }}
                className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 w-full"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
