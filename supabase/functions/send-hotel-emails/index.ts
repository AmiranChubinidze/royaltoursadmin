import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 200;
const MAX_CONTENT_LENGTH = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface KidInfo {
  age: number;
}

export interface GuestInfo {
  numAdults: number;
  numKids: number;
  kidsAges: KidInfo[];
}

interface HotelEmail {
  hotelName: string;
  hotelEmail: string;
  clientName: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  meals: string;
  confirmationCode: string;
  guestInfo: GuestInfo;
}

interface SendEmailRequest {
  hotels: HotelEmail[];
  confirmationCode: string;
}

// Sanitize string to prevent email header injection
function sanitizeString(str: string, maxLength: number): string {
  if (!str || typeof str !== 'string') return '';
  // Remove any newlines/carriage returns that could enable header injection
  return str.replace(/[\r\n]/g, ' ').trim().substring(0, maxLength);
}

// Validate email address format
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
}

// Validate hotel email data
function validateHotelEmail(hotel: HotelEmail): { valid: boolean; error?: string } {
  if (!isValidEmail(hotel.hotelEmail)) {
    return { valid: false, error: `Invalid email format: ${hotel.hotelEmail}` };
  }
  if (!hotel.hotelName || hotel.hotelName.length > MAX_NAME_LENGTH) {
    return { valid: false, error: 'Invalid hotel name' };
  }
  if (!hotel.clientName || hotel.clientName.length > MAX_NAME_LENGTH) {
    return { valid: false, error: 'Invalid client name' };
  }
  if (!hotel.checkIn || !hotel.checkOut) {
    return { valid: false, error: 'Missing check-in or check-out date' };
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

  try {
    const { hotels, confirmationCode }: SendEmailRequest = await req.json();

    // Validate request structure
    if (!Array.isArray(hotels) || hotels.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: hotels array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (hotels.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many hotels: maximum 50 allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each hotel
    for (const hotel of hotels) {
      const validation = validateHotelEmail(hotel);
      if (!validation.valid) {
        console.error(`Validation failed for hotel ${hotel.hotelName}: ${validation.error}`);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const sanitizedCode = sanitizeString(confirmationCode, 50);
    console.log(`Processing ${hotels.length} hotel emails for confirmation ${sanitizedCode}`);

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

    for (const hotel of hotels) {
      try {
        // Sanitize all inputs
        const hotelName = sanitizeString(hotel.hotelName, MAX_NAME_LENGTH);
        const clientName = sanitizeString(hotel.clientName, MAX_NAME_LENGTH);
        const checkIn = sanitizeString(hotel.checkIn, 20);
        const checkOut = sanitizeString(hotel.checkOut, 20);
        const roomType = sanitizeString(hotel.roomType, 100);
        const meals = sanitizeString(hotel.meals, 50);
        const code = sanitizeString(hotel.confirmationCode, 50);

        // Format kids info
        let kidsInfo = "0";
        if (hotel.guestInfo && hotel.guestInfo.numKids > 0) {
          const agesStr = (hotel.guestInfo.kidsAges || [])
            .slice(0, 10) // Limit to 10 kids max
            .map(k => `${Math.min(Math.max(0, k.age || 0), 18)} YO`)
            .join(", ");
          kidsInfo = `${Math.min(hotel.guestInfo.numKids, 10)} (${agesStr})`;
        }

        const numAdults = hotel.guestInfo ? Math.min(Math.max(0, hotel.guestInfo.numAdults || 0), 50) : 0;

        const emailBody = `
Please confirm the booking with the following details

Check in: ${checkIn}
Check out: ${checkOut}
Number of Adults: ${numAdults}
Number of Kids: ${kidsInfo}
Meal Type (BB/FB): ${meals}
Room Category (Standard/Upgrade): ${roomType}
Guest Name: ${clientName}

Please confirm receipt of this reservation request.

Best regards,
LLC Royal Georgian Tours
Phone: +995 599 123 456
Email: Royalgeorgiantours@gmail.com
        `.trim();

        await client.send({
          from: gmailUser,
          to: hotel.hotelEmail,
          subject: `Reservation Confirmation - ${clientName} - ${code}`,
          content: emailBody,
        });

        console.log(`Email sent successfully to ${hotelName} (${hotel.hotelEmail})`);
        results.push({ hotel: hotelName, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send email to ${hotel.hotelName}:`, errorMessage);
        results.push({ hotel: hotel.hotelName, success: false, error: errorMessage });
      }
    }

    await client.close();

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${hotels.length} emails sent successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: `${successCount}/${hotels.length} emails sent successfully`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-hotel-emails function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);