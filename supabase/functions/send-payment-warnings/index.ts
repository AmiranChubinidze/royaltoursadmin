import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_NAME_LENGTH = 200;
const MAX_CONTENT_LENGTH = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeString = (value: string, maxLength: number) => {
  if (!value || typeof value !== "string") return "";
  return value.replace(/[\r\n]/g, " ").trim().substring(0, maxLength);
};

const isValidEmail = (email: string) => {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email);
};

const parseDateFlexible = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateKeyUtc = (date: Date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Must match the frontend's roomStayKey (confirmationUtils.ts) so the persisted
// raw_payload.hotel_paid keys line up: `${hotelLower}::${rawCheckIn}`.
const stayPaidKey = (hotelName: string, rawCheckIn: string) =>
  `${hotelName.trim().toLowerCase()}::${rawCheckIn.trim()}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!gmailUser || !gmailPassword) {
    return new Response(
      JSON.stringify({ error: "Gmail credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: settings, error: settingsError } = await supabase
      .from("calendar_notification_settings")
      .select("user_id, enabled, time_local, tz_offset_min")
      .eq("enabled", true);

    if (settingsError) throw settingsError;
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = settings.map((s) => s.user_id);

    const [{ data: profiles }, { data: allHotels }, { data: confirmations }] = await Promise.all([
      supabase.from("profiles").select("id, email, display_name").in("id", userIds),
      supabase.from("saved_hotels").select("name, is_owned"),
      supabase.from("confirmations").select("id, confirmation_code, main_client_name, raw_payload"),
    ]);

    const ownedNameSet = new Set<string>();
    for (const hotel of allHotels || []) {
      const name = String(hotel.name || "").trim().toLowerCase();
      if (name && hotel.is_owned) ownedNameSet.add(name);
    }

    const profileById = new Map<string, { email: string; display_name: string | null }>();
    for (const profile of profiles || []) {
      profileById.set(profile.id, { email: profile.email, display_name: profile.display_name || null });
    }

    // Derive unpaid arriving stays (date-keyed), independent of which day "today" is.
    // One entry per non-owned hotel segment that isn't marked paid in hotel_paid.
    type Arrival = { dateKey: string; hotelName: string; clientName: string };
    const arrivals: Arrival[] = [];

    for (const confirmation of confirmations || []) {
      const payload = (confirmation.raw_payload || {}) as Record<string, any>;
      const itinerary = Array.isArray(payload.itinerary) ? payload.itinerary : [];
      const hotelPaid = (payload.hotel_paid || {}) as Record<string, boolean>;
      const clientName =
        confirmation.main_client_name ||
        (Array.isArray(payload.clients) && payload.clients[0]?.name) ||
        "Tourist";

      // Segment consecutive same-hotel runs (placeholders break runs) — mirrors
      // getHotelStays on the frontend. Owned hotels are dropped (no payment due).
      let currentHotel = "";
      let rawCheckIn = "";
      const pushSegment = () => {
        if (!currentHotel) return;
        const lower = currentHotel.trim().toLowerCase();
        if (!ownedNameSet.has(lower)) {
          const d = parseDateFlexible(rawCheckIn);
          const paid = hotelPaid[stayPaidKey(currentHotel, rawCheckIn)] === true;
          if (d && !paid) {
            arrivals.push({
              dateKey: formatDateKeyUtc(d),
              hotelName: currentHotel,
              clientName,
            });
          }
        }
        currentHotel = "";
        rawCheckIn = "";
      };

      for (const day of itinerary) {
        const hotelName = String(day?.hotel || "").trim();
        if (!hotelName || hotelName === "-" || hotelName.toLowerCase() === "n/a") {
          pushSegment();
          continue;
        }
        if (hotelName !== currentHotel) {
          pushSegment();
          currentHotel = hotelName;
          rawCheckIn = String(day?.date || "");
        }
      }
      pushSegment();
    }

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

    let sentCount = 0;

    for (const setting of settings) {
      const profile = profileById.get(setting.user_id);
      if (!profile || !isValidEmail(profile.email)) continue;

      const localNow = new Date(Date.now() - (setting.tz_offset_min || 0) * 60000);
      const localMinutes = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();
      const timeParts = String(setting.time_local || "09:00").split(":");
      if (timeParts.length !== 2) continue;
      const targetMinutes = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
      if (Number.isNaN(targetMinutes)) continue;
      if (localMinutes < targetMinutes) continue;

      const todayKey = formatDateKeyUtc(localNow);

      const { data: alreadySent } = await supabase
        .from("payment_warning_logs")
        .select("user_id")
        .eq("user_id", setting.user_id)
        .eq("date_local", todayKey)
        .maybeSingle();

      if (alreadySent) continue;

      const matching = arrivals.filter((a) => a.dateKey === todayKey);
      if (matching.length === 0) continue;

      const greetingName = sanitizeString(profile.display_name || profile.email.split("@")[0], MAX_NAME_LENGTH);
      const lines = matching.map((a) => {
        const hotel = sanitizeString(a.hotelName, MAX_NAME_LENGTH);
        return `- ${hotel} — guest checks in today, not marked paid`;
      });

      const body = `Hello ${greetingName},

Unpaid hotels for today's arrivals:
${lines.join("\n")}

Best regards,
Royal Georgian Tours`;

      await client.send({
        from: gmailUser,
        to: profile.email,
        subject: "Unpaid hotels — today's arrivals",
        content: body.substring(0, MAX_CONTENT_LENGTH),
      });

      await supabase.from("payment_warning_logs").insert({
        user_id: setting.user_id,
        date_local: todayKey,
      });

      sentCount += 1;
    }

    await client.close();

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
