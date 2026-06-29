import { Confirmation, ConfirmationPayload, GuestInfo } from "@/types/confirmation";

interface CottageConfirmationLetterProps {
  confirmation: Confirmation;
}

const GREEN = "#2c5e4a";
const GREEN_DARK = "#1f4536";
const GOLD = "#b08d57";
const CREAM = "#f5f3ec";

export function formatGuests(g: GuestInfo | undefined): string {
  if (!g) return "—";
  const parts: string[] = [`${g.numAdults} ${g.numAdults === 1 ? "Adult" : "Adults"}`];
  if (g.numKids > 0) {
    const ages = (g.kidsAges || []).map((k) => k.age).filter((a) => a > 0);
    const label = g.numKids === 1 ? "Child" : "Children";
    const yearWord = ages.length === 1 && ages[0] === 1 ? "year" : "years";
    const ageStr = ages.length ? ` (${ages.join(", ")} ${yearWord})` : "";
    parts.push(`${g.numKids} ${label}${ageStr}`);
  }
  return parts.join(" + ");
}

export function cottageNumberLabel(payload: ConfirmationPayload): string {
  const rn = payload.room_numbers;
  if (rn) {
    const nums = Object.values(rn).flat().sort((a, b) => a - b);
    if (nums.length) return nums.length === 1 ? `No. ${nums[0]}` : `No. ${nums.join(", ")}`;
  }
  return "—";
}

export function CottageConfirmationLetter({ confirmation }: CottageConfirmationLetterProps) {
  const payload = confirmation.raw_payload as ConfirmationPayload;
  const guestName = (payload?.clients || []).map((c) => c.name).filter(Boolean).join(", ") || "—";
  const checkIn = payload?.arrival?.date || "—";
  const checkOut = payload?.departure?.date || "—";
  const trackingNumber = payload?.trackingNumber;
  const guests = formatGuests(payload?.guestInfo);
  const cottage = cottageNumberLabel(payload);

  const Row = ({ label, value }: { label: string; value: string }) => (
    <tr className="border-b last:border-b-0" style={{ borderColor: "#e6e2d6" }}>
      <td className="p-[10px_14px] text-[11px] uppercase tracking-[0.12em] text-[#6b7163] print:text-[10px] print:p-[7px_10px]">
        {label}
      </td>
      <td className="p-[10px_14px] text-right font-semibold text-[#1c241e] print:p-[7px_10px] print:text-[12px]">
        {value}
      </td>
    </tr>
  );

  const Note = ({ children }: { children: React.ReactNode }) => (
    <div
      className="rounded-lg p-[12px_14px] text-sm text-[#48503f] leading-relaxed print:text-[11px] print:p-[9px_12px]"
      style={{ background: "#efeee6", borderLeft: `3px solid ${GREEN}` }}
    >
      {children}
    </div>
  );

  return (
    <div
      className="confirmation-letter-print mx-auto max-w-[760px] rounded-[10px] p-[34px_40px] print:max-w-full print:mx-0 print:p-0 print:rounded-none print:shadow-none"
      style={{
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        background: CREAM,
        color: "#1c241e",
        boxShadow: "0 6px 24px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header / emblem */}
      <div className="text-center print-break-avoid">
        <div
          className="inline-block tracking-[0.42em] font-semibold text-[#2c3a2f] text-lg print:text-base"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          INN MARTVILI
        </div>
        <div className="text-[10px] tracking-[0.3em] text-[#9aa08f] mt-1">CABINS AND MORE</div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="h-px w-8" style={{ background: GOLD }} />
          <span className="text-[11px] tracking-[0.32em]" style={{ color: GOLD }}>
            YOUR CABIN AWAITS
          </span>
          <span className="h-px w-8" style={{ background: GOLD }} />
        </div>
        <h1
          className="mt-2 text-[34px] font-normal text-[#2c5e4a] print:text-[26px]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Reservation Confirmed
        </h1>
      </div>

      {/* Confirmation strip */}
      <div
        className="grid grid-cols-3 gap-2 my-6 rounded-lg p-[14px_10px] print:my-4 print-break-avoid"
        style={{ background: "#fcfbf7", border: "1px solid #e6e2d6" }}
      >
        {[
          { label: "CONFIRMATION NO.", value: confirmation.confirmation_code },
          { label: "CONFIRMATION DATE", value: confirmation.confirmation_date },
          { label: "TRACKING NO.", value: trackingNumber?.trim() || "—" },
        ].map((c) => (
          <div key={c.label} className="text-center px-1">
            <div className="text-[9px] tracking-[0.14em] text-[#9aa08f] print:text-[8px]">{c.label}</div>
            <div className="mt-1 font-bold text-[#2c5e4a] print:text-[13px]">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Intro */}
      <p className="text-sm text-[#48503f] leading-relaxed mb-5 print:text-[11px] print:mb-3">
        Dear Guest, we are pleased to confirm your reservation at our cottage complex located near{" "}
        <strong className="text-[#2c241e]">Martvili Canyon</strong>. Below are the details of your booking.
      </p>

      {/* Booking details */}
      <section className="rounded-lg overflow-hidden mb-5 print:mb-4 print-break-avoid" style={{ border: "1px solid #e6e2d6" }}>
        <div
          className="px-4 py-2.5 text-white text-sm font-semibold tracking-[0.14em] print:py-2"
          style={{ background: GREEN_DARK }}
        >
          ● BOOKING DETAILS
        </div>
        <table className="w-full bg-white" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <Row label="Guest Name" value={guestName} />
            <Row label="Check-in Date" value={checkIn} />
            <Row label="Check-out Date" value={checkOut} />
            <Row label="Cottage Number" value={cottage} />
            <Row label="Number of Guests" value={guests} />
          </tbody>
        </table>
      </section>

      {/* Notes */}
      <div className="space-y-3 mb-6 print:mb-4 print-break-avoid">
        <Note>
          Our complex consists of fully equipped cottages suitable for both families and couples, located
          approximately <strong>4.8 km</strong> from Martvili Canyon. Guests also have access to a shared kitchen area.
        </Note>
        <Note>
          Please note that <strong>check-in is from 14:30</strong> and <strong>check-out is by 12:00</strong>. For any
          special requests or assistance, feel free to contact us.
        </Note>
      </div>

      {/* Sign-off */}
      <div className="text-center print-break-avoid">
        <div className="text-lg text-[#2c241e] print:text-base" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Kind regards,
        </div>
        <div className="mt-1 text-[11px] tracking-[0.28em]" style={{ color: GOLD }}>
          THE INN MARTVILI TEAM
        </div>
      </div>

      <div className="mt-6 pt-4 text-center text-[10px] tracking-[0.16em] text-[#7c8273] print:mt-4" style={{ borderTop: "1px solid #e6e2d6" }}>
        INN MARTVILI · CABINS &amp; MORE · NEAR MARTVILI CANYON, GEORGIA
      </div>
    </div>
  );
}
