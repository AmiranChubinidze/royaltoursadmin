import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, ArrowLeft } from "lucide-react";
import rtgLogoRound from "@/assets/rtg-logo-round.png";

type AuthMode = "login" | "signup" | "forgot-password";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
        if (error) throw error;

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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;

        // Send approval request to admin
        if (data.user) {
          await supabase.functions.invoke("user-approval", {
            body: { userEmail: email, userId: data.user.id },
          });
        }

        toast({
          title: "Account created",
          description: "Your account is pending admin approval. You'll be notified when approved.",
        });
        setPendingApproval(true);
      } else if (mode === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        if (error) throw error;
        setResetEmailSent(true);
        toast({
          title: "Reset email sent",
          description: "Check your email for the password reset link.",
        });
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
    }
  };

  const getButtonText = () => {
    if (loading) return "Loading...";
    switch (mode) {
      case "login": return "Sign In";
      case "signup": return "Sign Up";
      case "forgot-password": return "Send Reset Link";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={rtgLogoRound} 
              alt="Royal Georgian Tours" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-primary">
              Royal Georgian Tours
            </CardTitle>
            <CardDescription className="mt-1">{getTitle()}</CardDescription>
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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            {mode !== "forgot-password" && (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
