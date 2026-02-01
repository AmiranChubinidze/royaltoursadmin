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

const pluralize = (value: number, word: string) => {
  return `${value} ${word}${value === 1 ? "" : "s"}`;
};

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
      .select("user_id, enabled, time_local, tz_offset_min, use_all_hotels, use_all_other_hotels, remind_offset_days")
      .eq("enabled", true);

    if (settingsError) throw settingsError;
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = settings.map((s) => s.user_id);

    const [{ data: profiles }, { data: allHotels }, { data: hotelSelections }, { data: confirmations }] = await Promise.all([
      supabase.from("profiles").select("id, email, display_name").in("id", userIds),
      supabase.from("saved_hotels").select("id, name, is_owned"),
      supabase.from("calendar_notification_hotels").select("user_id, hotel_id").in("user_id", userIds),
      supabase.from("confirmations").select("id, confirmation_code, main_client_name, total_days, raw_payload"),
    ]);

    const hotelIdToName = new Map<string, string>();
    const ownedNameSet = new Set<string>();
    const otherNameSet = new Set<string>();
    for (const hotel of allHotels || []) {
      const name = String(hotel.name || "").trim();
      if (!name) continue;
      hotelIdToName.set(hotel.id, name);
      if (hotel.is_owned) {
        ownedNameSet.add(name.toLowerCase());
      } else {
        otherNameSet.add(name.toLowerCase());
      }
    }

    const profileById = new Map<string, { email: string; display_name: string | null }>();
    for (const profile of profiles || []) {
      profileById.set(profile.id, { email: profile.email, display_name: profile.display_name || null });
    }

    const selectionByUser = new Map<string, string[]>();
    for (const row of hotelSelections || []) {
      const list = selectionByUser.get(row.user_id) || [];
      list.push(row.hotel_id);
      selectionByUser.set(row.user_id, list);
    }

    const stayCount = new Map<string, number>();
    const stays: Array<{
      dateKey: string;
      hotelName: string;
      hotelLower: string;
      confirmationId: string;
      confirmationCode: string;
      touristName: string;
      adults: number;
      kids: number;
    }> = [];

    for (const confirmation of confirmations || []) {
      const payload = confirmation.raw_payload || {};
      const itinerary = (payload as any).itinerary || [];
      const guestInfo = (payload as any).guestInfo || {};
      const adults = Math.max(0, Math.min(50, Number(guestInfo.numAdults || 0)));
      const kids = Math.max(0, Math.min(50, Number(guestInfo.numKids || 0)));
      const touristName =
        confirmation.main_client_name ||
        ((payload as any).clients && (payload as any).clients[0]?.name) ||
        "Tourist";

      for (const day of itinerary) {
        const hotelName = String(day?.hotel || "").trim();
        if (!hotelName) continue;
        const hotelLower = hotelName.toLowerCase();
        if (!ownedNameSet.has(hotelLower) && !otherNameSet.has(hotelLower)) continue;
        const date = parseDateFlexible(day?.date);
        if (!date) continue;
        const dateKey = formatDateKeyUtc(date);
        const stayKey = `${confirmation.id}:${hotelLower}`;
        stayCount.set(stayKey, (stayCount.get(stayKey) || 0) + 1);
        stays.push({
          dateKey,
          hotelName,
          hotelLower,
          confirmationId: confirmation.id,
          confirmationCode: confirmation.confirmation_code,
          touristName,
          adults,
          kids,
        });
      }
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

      if (localMinutes < targetMinutes) {
        continue;
      }

      const offsetDays = Number(setting.remind_offset_days ?? 1);
      const targetDate = new Date(localNow.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      const targetKey = formatDateKeyUtc(targetDate);

      const { data: alreadySent } = await supabase
        .from("calendar_notification_logs")
        .select("user_id")
        .eq("user_id", setting.user_id)
        .eq("date_local", targetKey)
        .maybeSingle();

      if (alreadySent) continue;

      const selectedHotelIds = selectionByUser.get(setting.user_id) || [];
      const selectedOwnedNames = setting.use_all_hotels
        ? Array.from(ownedNameSet)
        : selectedHotelIds
            .map((id) => hotelIdToName.get(id))
            .filter((name): name is string => Boolean(name))
            .map((name) => name.toLowerCase())
            .filter((name) => ownedNameSet.has(name));
      const selectedOtherNames = setting.use_all_other_hotels
        ? Array.from(otherNameSet)
        : selectedHotelIds
            .map((id) => hotelIdToName.get(id))
            .filter((name): name is string => Boolean(name))
            .map((name) => name.toLowerCase())
            .filter((name) => otherNameSet.has(name));

      const selectedHotelNames = Array.from(new Set([...selectedOwnedNames, ...selectedOtherNames]));

      if (selectedHotelNames.length === 0) continue;

      const hotelSet = new Set(selectedHotelNames);
      const matching = stays.filter(
        (stay) => stay.dateKey === targetKey && hotelSet.has(stay.hotelLower)
      );

      if (matching.length === 0) continue;

      const greetingName = sanitizeString(profile.display_name || profile.email.split("@")[0], MAX_NAME_LENGTH);
      const lines = matching.map((stay) => {
        const stayKey = `${stay.confirmationId}:${stay.hotelLower}`;
        const days = stayCount.get(stayKey) || 1;
        const adultsText = pluralize(stay.adults, "adult");
        const kidsText = pluralize(stay.kids, "child");
        const daysText = pluralize(days, "day");
        const tourist = sanitizeString(stay.touristName, MAX_NAME_LENGTH);
        const hotel = sanitizeString(stay.hotelName, MAX_NAME_LENGTH);
        return `- Tomorrow ${tourist} is coming, ${adultsText}, ${kidsText}, staying for ${daysText} (Hotel: ${hotel})`;
      });

      const body = `Hello ${greetingName},

Tomorrow arrivals at owned hotels:
${lines.join("\n")}

Best regards,
LLC Royal Georgian Tours`;

      const finalBody = body.substring(0, MAX_CONTENT_LENGTH);

      await client.send({
        from: gmailUser,
        to: profile.email,
        subject: "Tomorrow's owned-hotel arrivals",
        content: finalBody,
      });

      await supabase.from("calendar_notification_logs").insert({
        user_id: setting.user_id,
        date_local: targetKey,
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
