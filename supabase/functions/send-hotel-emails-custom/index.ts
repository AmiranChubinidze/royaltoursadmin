import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 200;
const MAX_SUBJECT_LENGTH = 500;
const MAX_BODY_LENGTH = 10000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Sanitize string to prevent email header injection
function sanitizeString(str: string, maxLength: number): string {
  if (!str || typeof str !== 'string') return '';
  // Remove any newlines/carriage returns that could enable header injection
  return str.replace(/[\r\n]/g, ' ').trim().substring(0, maxLength);
}

// Sanitize email body - allow newlines but prevent header injection patterns
function sanitizeBody(str: string, maxLength: number): string {
  if (!str || typeof str !== 'string') return '';
  // Remove potential header injection patterns but keep legitimate newlines
  return str
    .replace(/\r\n\r\n/g, '\n\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .substring(0, maxLength);
}

// Validate email address format
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
}

// Validate email data
function validateEmailData(email: EmailData): { valid: boolean; error?: string } {
  if (!isValidEmail(email.hotelEmail)) {
    return { valid: false, error: `Invalid email format: ${email.hotelEmail}` };
  }
  if (!email.hotelName || email.hotelName.length > MAX_NAME_LENGTH) {
    return { valid: false, error: 'Invalid hotel name' };
  }
  if (!email.subject || email.subject.length > MAX_SUBJECT_LENGTH) {
    return { valid: false, error: 'Invalid or missing subject' };
  }
  if (!email.body || email.body.length > MAX_BODY_LENGTH) {
    return { valid: false, error: 'Invalid or missing email body' };
  }
  return { valid: true };
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

  // Validate that GMAIL_USER is a valid email address
  if (!isValidEmail(gmailUser)) {
    console.error("GMAIL_USER is not a valid email address:", gmailUser);
    return new Response(
      JSON.stringify({ error: "GMAIL_USER secret must be a valid email address (e.g., yourname@gmail.com)" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let client: SMTPClient | null = null;

  try {
    const { emails, confirmationCode }: SendEmailRequest = await req.json();

    // Validate request structure
    if (!Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: emails array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (emails.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many emails: maximum 50 allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each email
    for (const email of emails) {
      const validation = validateEmailData(email);
      if (!validation.valid) {
        console.error(`Validation failed for email to ${email.hotelName}: ${validation.error}`);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const sanitizedCode = sanitizeString(confirmationCode, 50);
    console.log(`Processing ${emails.length} custom emails for confirmation ${sanitizedCode}`);

    client = new SMTPClient({
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
        // Sanitize all inputs
        const hotelName = sanitizeString(email.hotelName, MAX_NAME_LENGTH);
        const subject = sanitizeString(email.subject, MAX_SUBJECT_LENGTH);
        const body = sanitizeBody(email.body, MAX_BODY_LENGTH);

        await client.send({
          from: gmailUser,
          to: email.hotelEmail,
          subject: subject,
          content: body,
        });

        console.log(`Email sent successfully to ${hotelName} (${email.hotelEmail})`);
        results.push({ hotel: hotelName, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send email to ${email.hotelName}:`, errorMessage);
        results.push({ hotel: email.hotelName, success: false, error: errorMessage });
      }
    }

    // Only close if client was created
    if (client) {
      await client.close();
    }

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
    // Safely close client if it exists
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error("Error closing SMTP client:", closeError);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-hotel-emails-custom function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
