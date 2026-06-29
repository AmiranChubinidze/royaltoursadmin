import { Confirmation, ConfirmationPayload, InvoiceData } from "@/types/confirmation";
import { formatGuests, cottageNumberLabel } from "@/components/CottageConfirmationLetter";
import signatureEliso from "@/assets/signature-eliso.png";

interface CottageInvoiceProps {
  confirmation: Confirmation;
  invoice: InvoiceData;
}

const GREEN = "#2c5e4a";

export function CottageInvoice({ confirmation, invoice }: CottageInvoiceProps) {
  const payload = confirmation.raw_payload as ConfirmationPayload;
  const guestName = (payload?.clients || []).map((c) => c.name).filter(Boolean).join(", ") || "—";
  const guests = formatGuests(payload?.guestInfo);
  const cottage = cottageNumberLabel(payload);
  const checkIn = payload?.arrival?.date || "—";
  const checkOut = payload?.departure?.date || "—";

  const currency = invoice.currency || confirmation.price_currency || "USD";
  const sym = currency === "GEL" ? "₾" : "$";
  const money = (n: number) => `${Math.round(n * 100) / 100}${sym}`;

  const nights = confirmation.total_nights ?? 0;
  const rate = invoice.rate ?? confirmation.price ?? 0;
  const amount = nights * rate;
  const additional = invoice.additional_charges ?? 0;
  const subtotal = amount;
  const total = subtotal + additional;

  const cottageDetail = cottage.replace(/^No\.\s*/, "#");

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a8f82]">{children}</div>
  );
  const Field = ({ children }: { children: React.ReactNode }) => (
    <div className="pl-2 text-[#1c241e] font-medium" style={{ borderLeft: `3px solid ${GREEN}` }}>
      {children}
    </div>
  );

  return (
    <div
      className="invoice-print mx-auto max-w-[760px] bg-white rounded-[10px] p-[40px_44px] print:max-w-full print:mx-0 print:rounded-none print:shadow-none print:p-0"
      style={{
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        color: "#1c241e",
        boxShadow: "0 6px 24px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <div className="print-break-avoid">
        <div className="text-[34px] font-extrabold tracking-tight print:text-[26px]" style={{ color: GREEN }}>
          INN MARTVILI
        </div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#8a8f82] mt-1">
          Invoice • Cottages &amp; More near Martvili Canyon
        </div>
        <div className="h-1 mt-3 rounded" style={{ background: GREEN }} />
      </div>

      {/* Meta + entity */}
      <div className="flex justify-between gap-6 mt-6 print-break-avoid">
        <div className="space-y-3">
          <div>
            <Label>Invoice Number</Label>
            <Field>{invoice.invoice_code || confirmation.confirmation_code}</Field>
          </div>
          <div>
            <Label>Invoice Date</Label>
            <Field>{invoice.invoice_date || confirmation.confirmation_date}</Field>
          </div>
        </div>
        <div className="text-right text-[12px] leading-relaxed text-[#48503f] print:text-[11px]">
          <div>
            <strong>Individual Entrepreneur:</strong> Eliso Pruidze
          </div>
          <div>
            <strong>ID:</strong> 60003004937
          </div>
          <div>
            <strong>Phone:</strong> +995 599 40 67 41
          </div>
          <div>
            <strong>Bank Account:</strong> GE22BG0000000823495300
          </div>
          <div>
            <strong>Bank:</strong> Bank of Georgia
          </div>
        </div>
      </div>

      {/* Reservation details */}
      <div className="mt-7 print-break-avoid">
        <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#5a6052] pb-1.5 mb-3" style={{ borderBottom: "1px solid #e6e2d6" }}>
          Reservation Details
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <Label>Guest Name</Label>
            <Field>{guestName}</Field>
          </div>
          <div>
            <Label>Check-in Date</Label>
            <Field>{checkIn}</Field>
          </div>
          <div>
            <Label>Cottage Number</Label>
            <Field>{cottageDetail}</Field>
          </div>
          <div>
            <Label>Check-out Date</Label>
            <Field>{checkOut}</Field>
          </div>
          <div>
            <Label>Number of Guests</Label>
            <Field>{guests}</Field>
          </div>
        </div>
      </div>

      {/* Billing breakdown */}
      <div className="mt-7 print-break-avoid">
        <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#5a6052] pb-1.5 mb-3" style={{ borderBottom: "1px solid #e6e2d6" }}>
          Billing Breakdown
        </div>
        <table className="w-full text-sm print:text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.1em] text-[#8a8f82]" style={{ borderBottom: "1px solid #e6e2d6" }}>
              <th className="text-left font-semibold py-2">Description</th>
              <th className="text-center font-semibold py-2 w-16">Nights</th>
              <th className="text-right font-semibold py-2 w-24">Rate</th>
              <th className="text-right font-semibold py-2 w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f0eee5" }}>
              <td className="py-3">
                <div className="font-semibold text-[#1c241e]">{invoice.line_description || "Cottage Stay"}</div>
                <div className="text-xs text-[#8a8f82]">Cottage {cottageDetail}</div>
              </td>
              <td className="text-center text-[#48503f]">{nights}</td>
              <td className="text-right text-[#48503f]">{money(rate)}</td>
              <td className="text-right font-semibold">{money(amount)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className="w-64 text-sm print:text-[12px]">
            <div className="flex justify-between py-1 text-[#48503f]">
              <span>Subtotal:</span>
              <span className="font-semibold text-[#1c241e]">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-[#48503f]" style={{ borderBottom: "1px solid #e6e2d6" }}>
              <span>Additional Charges:</span>
              <span className="font-semibold text-[#1c241e]">{money(additional)}</span>
            </div>
            <div className="flex justify-between py-2 text-base">
              <span className="text-[#48503f]">Total Amount:</span>
              <span className="font-extrabold" style={{ color: GREEN }}>
                {money(total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / signature */}
      <div className="flex items-end justify-between mt-10 print:mt-8 print-break-avoid">
        <div className="text-center">
          <img
            src={signatureEliso}
            alt="Authorized signature"
            className="h-16 w-auto mx-auto mb-1 object-contain print:h-12"
          />
          <div className="w-44 border-b border-dashed border-[#b8bcae] mb-1" />
          <div className="text-xs text-[#8a8f82]">Authorized Signature</div>
        </div>
        <div className="font-semibold" style={{ color: GREEN }}>
          Thank you for choosing Inn Martvili!
        </div>
      </div>
    </div>
  );
}
