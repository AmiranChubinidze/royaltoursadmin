import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Secure HMAC-based token generation
async function generateSecureToken(userId: string, timestamp: number): Promise<string> {
  const secret = Deno.env.get("APPROVAL_SECRET");
  if (!secret) {
    throw new Error("APPROVAL_SECRET not configured");
  }
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const data = encoder.encode(`${userId}:${timestamp}`);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return timestamp and hash combined
  return `${timestamp.toString(36)}.${hashHex.substring(0, 32)}`;
}

// Verify the token with expiration check
async function verifySecureToken(userId: string, token: string): Promise<boolean> {
  const secret = Deno.env.get("APPROVAL_SECRET");
  if (!secret) {
    console.error("APPROVAL_SECRET not configured");
    return false;
  }
  
  try {
    const [timestampStr, providedHash] = token.split('.');
    if (!timestampStr || !providedHash) {
      console.error("Invalid token format");
      return false;
    }
    
    const timestamp = parseInt(timestampStr, 36);
    
    // Check if token is expired (24 hours)
    const now = Date.now();
    const tokenAge = now - timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (tokenAge > maxAge) {
      console.error("Token expired");
      return false;
    }
    
    // Regenerate the expected token
    const expectedToken = await generateSecureToken(userId, timestamp);
    const [, expectedHash] = expectedToken.split('.');
    
    // Constant-time comparison to prevent timing attacks
    if (providedHash.length !== expectedHash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < providedHash.length; i++) {
      result |= providedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error("Token verification error:", error);
    return false;
  }
}

// Get admin emails from user_roles table
async function getAdminEmails(supabaseUrl: string, supabaseServiceKey: string): Promise<string[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  
  if (error || !data || data.length === 0) {
    console.error("Error fetching admin roles:", error);
    return [];
  }
  
  const userIds = (data as { user_id: string }[]).map(r => r.user_id);
  
  // Get emails from profiles table
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("email")
    .in("id", userIds);
  
  if (profilesError || !profiles) {
    console.error("Error fetching admin emails:", profilesError);
    return [];
  }
  
  return (profiles as { email: string }[]).map(p => p.email).filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const userId = url.searchParams.get("userId");
    const token = url.searchParams.get("token");

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    // Handle approval action from email link (GET request)
    if (action === "approve" && userId && token) {
      // Verify secure token
      const isValid = await verifySecureToken(userId, token);
      if (!isValid) {
        return new Response(
          `<html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #c53030;">✗ Invalid or Expired Link</h1>
            <p>This approval link is invalid or has expired (links expire after 24 hours).</p>
            <p>Please use the Admin Panel to approve users or request a new approval link.</p>
          </body></html>`,
          { status: 403, headers: { "Content-Type": "text/html", ...corsHeaders } }
        );
      }

      // Get user email before approving
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

      const { error } = await supabase
        .from("profiles")
        .update({ approved: true })
        .eq("id", userId);

      if (error) {
        console.error("Error approving user:", error);
        return new Response("Error approving user", { status: 500 });
      }

      // Confirm the user's email so they can sign in
      await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });

      // Assign 'visitor' role to the newly approved user
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "visitor" }, { onConflict: "user_id,role" });

      if (roleError) {
        console.error("Error assigning visitor role:", roleError);
        // Don't fail the approval, just log the error
      } else {
        console.log(`Assigned 'visitor' role to user ${userId}`);
      }

      // Send notification email to user
      if (profile?.email && gmailUser && gmailPassword) {
        try {
          const client = new SMTPClient({
            connection: {
              hostname: "smtp.gmail.com",
              port: 465,
              tls: true,
              auth: { username: gmailUser, password: gmailPassword },
            },
          });

          await client.send({
            from: gmailUser,
            to: profile.email,
            subject: "Your Account Has Been Approved!",
            content: "Your account has been approved",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2f5597;">Account Approved!</h2>
                <p>Great news! Your account has been approved by the administrator.</p>
                <p>You can now sign in to the Confirmation System.</p>
                <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth" 
                   style="display: inline-block; background: #2f5597; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                  Sign In Now
                </a>
              </div>
            `,
          });
          await client.close();
          console.log(`Approval notification sent to ${profile.email}`);
        } catch (emailError) {
          console.error("Failed to send approval notification:", emailError);
        }
      }

      return new Response(
        `<html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #2f5597;">✓ User Approved</h1>
          <p>The user has been notified via email and can now sign in.</p>
        </body></html>`,
        { headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    // Handle POST requests
    if (req.method === "POST") {
      const body = await req.json();
      const { userEmail, userId: bodyUserId, action: postAction } = body;

      // Approve user + confirm email (called from admin panel)
      if (postAction === "approve-user" && bodyUserId && userEmail) {
        const { error: approveError } = await supabase
          .from("profiles")
          .update({ approved: true })
          .eq("id", bodyUserId);

        if (approveError) {
          return new Response(JSON.stringify({ error: approveError.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({ user_id: bodyUserId, role: "visitor" }, { onConflict: "user_id,role" });

        if (roleError) {
          console.error("Error assigning visitor role:", roleError);
        }

        await supabase.auth.admin.updateUserById(bodyUserId, {
          email_confirm: true,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Reject user (called from admin panel)
      if (postAction === "reject-user" && bodyUserId) {
        // Remove profile first
        await supabase
          .from("profiles")
          .delete()
          .eq("id", bodyUserId);

        // Remove roles
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", bodyUserId);

        // Delete auth user
        await supabase.auth.admin.deleteUser(bodyUserId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Send notification to user that they've been approved (called from admin panel)
      if (postAction === "notify-approved" && userEmail) {
        if (!gmailUser || !gmailPassword) {
          console.error("Gmail credentials not configured");
          return new Response(JSON.stringify({ error: "Email service not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const client = new SMTPClient({
          connection: {
            hostname: "smtp.gmail.com",
            port: 465,
            tls: true,
            auth: { username: gmailUser, password: gmailPassword },
          },
        });

        await client.send({
          from: gmailUser,
          to: userEmail,
          subject: "Your Account Has Been Approved!",
          content: "Your account has been approved",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2f5597;">Account Approved!</h2>
              <p>Great news! Your account has been approved by the administrator.</p>
              <p>You can now sign in to the Confirmation System.</p>
              <div style="margin-top: 20px;">
                <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth" 
                   style="display: inline-block; background: #2f5597; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  Sign In Now
                </a>
              </div>
            </div>
          `,
        });

        await client.close();
        console.log(`Approval notification sent to ${userEmail}`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Send approval request to admin (new signup)
      if (userEmail && bodyUserId) {
        if (!gmailUser || !gmailPassword) {
          console.error("Gmail credentials not configured");
          return new Response(JSON.stringify({ error: "Email service not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Get admin emails from database
        const adminEmails = await getAdminEmails(supabaseUrl, supabaseServiceKey);
        if (adminEmails.length === 0) {
          console.error("No admin users found in database");
          return new Response(JSON.stringify({ error: "No admin users configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Generate secure approval token with current timestamp
        const timestamp = Date.now();
        const approvalToken = await generateSecureToken(bodyUserId, timestamp);
        const approvalLink = `${supabaseUrl}/functions/v1/user-approval?action=approve&userId=${bodyUserId}&token=${encodeURIComponent(approvalToken)}`;

        const client = new SMTPClient({
          connection: {
            hostname: "smtp.gmail.com",
            port: 465,
            tls: true,
            auth: { username: gmailUser, password: gmailPassword },
          },
        });

        // Send to all admin users
        for (const adminEmail of adminEmails) {
          try {
            await client.send({
              from: gmailUser,
              to: adminEmail,
              subject: `[Approval Required] New User: ${userEmail}`,
              content: "New user registration request",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2f5597;">New User Registration Request</h2>
                  <p>A new user has requested access to the Confirmation System:</p>
                  <div style="background: #f4f6fb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Email:</strong> ${userEmail}</p>
                  </div>
                  <p>Click the button below to approve this user:</p>
                  <a href="${approvalLink}" style="display: inline-block; background: #2f5597; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                    Approve User
                  </a>
                  <p style="margin-top: 20px; color: #666; font-size: 12px;">
                    This link expires in 24 hours. You can also manage users in the Admin Panel.
                  </p>
                </div>
              `,
            });
            console.log(`Approval email sent to admin: ${adminEmail}`);
          } catch (emailError) {
            console.error(`Failed to send to ${adminEmail}:`, emailError);
          }
        }

        await client.close();
        console.log(`Approval email sent to ${adminEmails.length} admin(s) for user: ${userEmail}`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error: unknown) {
    console.error("Error in user-approval function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
