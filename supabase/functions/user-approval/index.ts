import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "am1ko.ch4b1n1dze@gmail.com";

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
      const expectedToken = btoa(userId + "approve-secret-key").substring(0, 20);
      if (token !== expectedToken) {
        return new Response("Invalid token", { status: 403 });
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
      const { userEmail, userId, action: postAction } = body;

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
      if (userEmail && userId) {
        if (!gmailUser || !gmailPassword) {
          console.error("Gmail credentials not configured");
          return new Response(JSON.stringify({ error: "Email service not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const approvalToken = btoa(userId + "approve-secret-key").substring(0, 20);
        const approvalLink = `${supabaseUrl}/functions/v1/user-approval?action=approve&userId=${userId}&token=${approvalToken}`;

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
          to: ADMIN_EMAIL,
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
                Or manage all users in the Admin Panel.
              </p>
            </div>
          `,
        });

        await client.close();
        console.log(`Approval email sent to admin for user: ${userEmail}`);

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
