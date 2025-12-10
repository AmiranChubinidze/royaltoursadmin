import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailData {
  hotelName: string;
  hotelEmail: string;
  subject: string;
  body: string;
}

interface SendEmailRequest {
  emails: EmailData[];
  confirmationCode: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    console.error("Gmail credentials not configured");
    return new Response(
      JSON.stringify({ error: "Gmail credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { emails, confirmationCode }: SendEmailRequest = await req.json();

    console.log(`Processing ${emails.length} custom emails for confirmation ${confirmationCode}`);

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailPassword,
        },
      },
    });

    const results: { hotel: string; success: boolean; error?: string }[] = [];

    for (const email of emails) {
      try {
        await client.send({
          from: gmailUser,
          to: email.hotelEmail,
          subject: email.subject,
          content: email.body,
        });

        console.log(`Email sent successfully to ${email.hotelName} (${email.hotelEmail})`);
        results.push({ hotel: email.hotelName, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send email to ${email.hotelName}:`, errorMessage);
        results.push({ hotel: email.hotelName, success: false, error: errorMessage });
      }
    }

    await client.close();

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${emails.length} emails sent successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: `${successCount}/${emails.length} emails sent successfully`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-hotel-emails-custom function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
