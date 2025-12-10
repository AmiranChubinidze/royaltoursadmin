import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log(`Processing ${hotels.length} hotel emails for confirmation ${confirmationCode}`);

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
        // Format kids info
        let kidsInfo = "0";
        if (hotel.guestInfo.numKids > 0) {
          const agesStr = hotel.guestInfo.kidsAges.map(k => `${k.age} YO`).join(", ");
          kidsInfo = `${hotel.guestInfo.numKids} (${agesStr})`;
        }

        const emailBody = `
Please confirm the booking with the following details

Check in: ${hotel.checkIn}
Check out: ${hotel.checkOut}
Number of Adults: ${hotel.guestInfo.numAdults}
Number of Kids: ${kidsInfo}
Meal Type (BB/FB): ${hotel.meals}
Room Category (Standard/Upgrade): ${hotel.roomType}
Guest Name: ${hotel.clientName}

Please confirm receipt of this reservation request.

Best regards,
LLC Royal Georgian Tours
Phone: +995 599 123 456
Email: Royalgeorgiantours@gmail.com
        `.trim();

        await client.send({
          from: gmailUser,
          to: hotel.hotelEmail,
          subject: `Reservation Confirmation - ${hotel.clientName} - ${hotel.confirmationCode}`,
          content: emailBody,
        });

        console.log(`Email sent successfully to ${hotel.hotelName} (${hotel.hotelEmail})`);
        results.push({ hotel: hotel.hotelName, success: true });
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
