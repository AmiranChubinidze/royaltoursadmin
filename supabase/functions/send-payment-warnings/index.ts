import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_NAME_LENGTH = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitize = (value: string, maxLength = MAX_NAME_LENGTH) => {
  if (!value || typeof value !== "string") return "";
  return value.replace(/[\r\n]/g, " ").trim().substring(0, maxLength);
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isValidEmail = (email: string) => typeof email === "string" && EMAIL_REGEX.test(email);

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

// Must match the frontend's roomStayKey (confirmationUtils.ts): `${hotelLower}::${rawCheckIn}`.
const stayKey = (hotelName: string, rawCheckIn: string) =>
  `${hotelName.trim().toLowerCase()}::${rawCheckIn.trim()}`;

interface Row {
  hotel: string;
  code: string;
  amount: number | null;
  currency: string;
}

const formatMoney = (amount: number, currency: string) => {
  const n = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  const withSep = n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (currency === "USD") return `$${withSep}`;
  if (currency === "GEL") return `${withSep} ₾`;
  return `${withSep} ${currency}`;
};

const totalsLine = (rows: Row[]) => {
  const byCur: Record<string, number> = {};
  for (const r of rows) if (r.amount != null) byCur[r.currency] = (byCur[r.currency] || 0) + r.amount;
  const parts = Object.entries(byCur).map(([cur, amt]) => formatMoney(amt, cur));
  return parts.length ? parts.join("  ·  ") : "—";
};

const renderHtml = (rows: Row[], note?: string) => {
  const total = totalsLine(rows);
  const body = rows
    .map(
      (r) => `
      <tr style="border-top:1px solid #fde68a;">
        <td style="padding:11px 18px;">
          <div style="font-weight:600;color:#1f2937;">${escapeHtml(r.hotel)}</div>
          <div style="font-size:12px;color:#b45309;font-family:ui-monospace,Menlo,Consolas,monospace;">${escapeHtml(r.code)}</div>
        </td>
        <td style="padding:11px 18px;text-align:right;font-weight:600;color:#1f2937;white-space:nowrap;">${
          r.amount != null ? formatMoney(r.amount, r.currency) : "—"
        }</td>
      </tr>`
    )
    .join("");
  return `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:8px;">
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;overflow:hidden;">
      <div style="padding:15px 18px ${note ? "2px" : "11px"};font-size:15px;font-weight:700;color:#92400e;">Today's check-ins — not paid</div>
      ${note ? `<div style="padding:0 18px 11px;font-size:12px;color:#b45309;">${escapeHtml(note)}</div>` : ""}
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>
          ${body}
          <tr style="border-top:2px solid #fbbf24;background:#fef3c7;">
            <td style="padding:13px 18px;font-weight:700;color:#92400e;">Total</td>
            <td style="padding:13px 18px;text-align:right;font-weight:700;color:#92400e;white-space:nowrap;">${total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
};

const renderText = (rows: Row[], note?: string) => {
  const lines = rows.map(
    (r) => `- ${r.hotel} (${r.code}) — ${r.amount != null ? formatMoney(r.amount, r.currency) : "—"}`
  );
  return `Today's check-ins — not paid:${note ? `\n(${note})` : ""}\n\n${lines.join("\n")}\n\nTotal: ${totalsLine(rows)}`;
};

const PLACEHOLDER_ROWS: Row[] = [
  { hotel: "Tbilisi Marriott", code: "A28062026", amount: 120, currency: "USD" },
  { hotel: "Batumi Boutique Hotel", code: "A28062026", amount: 90, currency: "USD" },
  { hotel: "Kutaisi Grand", code: "B28062026", amount: 300, currency: "GEL" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase credentials" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!gmailUser || !gmailPassword) {
    return new Response(JSON.stringify({ error: "Gmail credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let isTest = false;
  try {
    const body = await req.json();
    isTest = body?.test === true;
  } catch {
    // no body — scheduled run
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

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
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", userIds);

    const profileById = new Map<string, { email: string; display_name: string | null }>();
    for (const p of profiles || []) profileById.set(p.id, { email: p.email, display_name: p.display_name || null });

    const client = new SMTPClient({
      connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: gmailUser, password: gmailPassword } },
    });

    const send = async (to: string, subject: string, rows: Row[], note?: string) => {
      await client.send({ from: gmailUser, to, subject, content: renderText(rows, note), html: renderHtml(rows, note) });
    };

    let sentCount = 0;

    // TEST: one placeholder email to every enabled recipient, no gating/dedup.
    if (isTest) {
      for (const setting of settings) {
        const profile = profileById.get(setting.user_id);
        if (!profile || !isValidEmail(profile.email)) continue;
        await send(profile.email, "[TEST] Today's check-ins — not paid", PLACEHOLDER_ROWS, "Test email — sample hotels and prices.");
        sentCount += 1;
      }
      await client.close();
      return new Response(JSON.stringify({ success: true, test: true, sent: sentCount }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // REAL: derive unpaid arriving stays (date-keyed) with code + amount from the snapshot.
    const { data: allHotels } = await supabase.from("saved_hotels").select("name, is_owned");
    const ownedNameSet = new Set<string>();
    for (const h of allHotels || []) {
      const name = String(h.name || "").trim().toLowerCase();
      if (name && h.is_owned) ownedNameSet.add(name);
    }

    const { data: confirmations } = await supabase
      .from("confirmations")
      .select("id, confirmation_code, raw_payload");

    type Arrival = Row & { dateKey: string };
    const arrivals: Arrival[] = [];

    for (const confirmation of confirmations || []) {
      const payload = (confirmation.raw_payload || {}) as Record<string, any>;
      const itinerary = Array.isArray(payload.itinerary) ? payload.itinerary : [];
      const hotelPaid = (payload.hotel_paid || {}) as Record<string, boolean>;
      const hotelAmounts = (payload.hotel_amounts || {}) as Record<string, { amount: number; currency: string }>;
      const code = sanitize(confirmation.confirmation_code || "", 40);

      let currentHotel = "";
      let rawCheckIn = "";
      const pushSegment = () => {
        if (!currentHotel) return;
        const lower = currentHotel.trim().toLowerCase();
        if (!ownedNameSet.has(lower)) {
          const d = parseDateFlexible(rawCheckIn);
          const key = stayKey(currentHotel, rawCheckIn);
          if (d && hotelPaid[key] !== true) {
            const amt = hotelAmounts[key];
            arrivals.push({
              dateKey: formatDateKeyUtc(d),
              hotel: sanitize(currentHotel),
              code,
              amount: amt && typeof amt.amount === "number" ? amt.amount : null,
              currency: amt?.currency || "USD",
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

    for (const setting of settings) {
      const profile = profileById.get(setting.user_id);
      if (!profile || !isValidEmail(profile.email)) continue;

      const localNow = new Date(Date.now() - (setting.tz_offset_min || 0) * 60000);
      const localMinutes = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();
      const timeParts = String(setting.time_local || "09:00").split(":");
      if (timeParts.length !== 2) continue;
      const targetMinutes = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
      if (Number.isNaN(targetMinutes) || localMinutes < targetMinutes) continue;

      const todayKey = formatDateKeyUtc(localNow);

      const { data: alreadySent } = await supabase
        .from("payment_warning_logs")
        .select("user_id")
        .eq("user_id", setting.user_id)
        .eq("date_local", todayKey)
        .maybeSingle();
      if (alreadySent) continue;

      const rows: Row[] = arrivals.filter((a) => a.dateKey === todayKey).map(({ dateKey: _omit, ...row }) => row);
      if (rows.length === 0) continue;

      await send(profile.email, "Today's check-ins — not paid", rows);
      await supabase.from("payment_warning_logs").insert({ user_id: setting.user_id, date_local: todayKey });
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
