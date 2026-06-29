import { Confirmation, ConfirmationPayload, InvoiceData } from "@/types/confirmation";
import signatureStamp from "@/assets/signature-levani.png";

interface RGTInvoiceProps {
  confirmation: Confirmation;
  invoice: InvoiceData;
}

const NAVY = "#1f3a5f";

export function RGTInvoice({ confirmation, invoice }: RGTInvoiceProps) {
  const payload = confirmation.raw_payload as ConfirmationPayload;
  const guestName = payload?.clients?.[0]?.name || "—";
  const arrival = payload?.arrival?.date || confirmation.arrival_date || "—";
  const departure = payload?.departure?.date || confirmation.departure_date || "—";

  const currency = invoice.currency || confirmation.price_currency || "USD";
  const sym = currency === "GEL" ? "₾" : "$";
  const amount = invoice.amount ?? confirmation.price ?? 0;
  const money = (n: number) => `${Math.round(n * 100) / 100}${sym}`;

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9aa3b2]">{children}</div>
  );
  const Field = ({ children, bold }: { children: React.ReactNode; bold?: boolean }) => (
    <div className={`pl-2 text-[#1c2533] ${bold ? "font-semibold" : "font-medium"}`} style={{ borderLeft: `3px solid ${NAVY}` }}>
      {children}
    </div>
  );

  return (
    <div
      className="invoice-print mx-auto max-w-[760px] bg-white rounded-[10px] p-[40px_44px] print:max-w-full print:mx-0 print:rounded-none print:shadow-none print:p-0"
      style={{
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        color: "#1c2533",
        boxShadow: "0 6px 24px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between gap-6 print-break-avoid">
        <div>
          <div
            className="inline-block text-white text-xl font-extrabold tracking-[0.12em] px-4 py-2 rounded print:text-lg"
            style={{ background: NAVY }}
          >
            INVOICE
          </div>
          <div className="space-y-3 mt-5">
            <div>
              <Label>Invoice Number</Label>
              <Field>{invoice.invoice_code || confirmation.confirmation_code}</Field>
            </div>
            <div>
              <Label>Invoice Date</Label>
              <Field>{invoice.invoice_date || confirmation.confirmation_date}</Field>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Field>{invoice.payment_method || "Bank Transfer"}</Field>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold print:text-lg" style={{ color: NAVY }}>
            Royal Georgian Tours
          </div>
          <div className="text-[12px] leading-relaxed text-[#48526a] mt-2 print:text-[11px]">
            <div>
              <strong>IE:</strong> Levani Shanshiashvili
            </div>
            <div>
              <strong>ID:</strong> 01017040069
            </div>
            <div>
              <strong>Phone:</strong> +995 573 855 37
            </div>
            <div>
              <strong>Bank:</strong> Bank of Georgia
            </div>
            <div>
              <strong>Branch:</strong> Tbilisi Branch BAGAGE22BOG
            </div>
            <div>
              <strong>Account:</strong> GE45BG0000000612307068
            </div>
          </div>
        </div>
      </div>

      <div className="h-px my-6" style={{ background: NAVY }} />

      {/* Bill to + guest */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 print-break-avoid">
        <div>
          <Label>Bill To</Label>
          <Field bold>{invoice.bill_to?.trim() || "—"}</Field>
        </div>
        <div>
          <Label>Arrival</Label>
          <Field>{arrival}</Field>
        </div>
        <div>
          <Label>Guest Name</Label>
          <Field>{guestName}</Field>
        </div>
        <div>
          <Label>Departure</Label>
          <Field>{departure}</Field>
        </div>
      </div>

      {/* Payment details */}
      <div className="mt-8 print-break-avoid">
        <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#5a6478] pb-1.5 mb-3" style={{ borderBottom: "1px solid #e3e7ee" }}>
          Payment Details
        </div>
        <table className="w-full text-sm print:text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.1em] text-white" style={{ background: NAVY }}>
              <th className="text-left font-semibold p-2.5">Description</th>
              <th className="text-right font-semibold p-2.5 w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e3e7ee" }}>
              <td className="py-3 px-2.5">
                <div className="font-semibold text-[#1c2533]">{invoice.service_description || "Tour & Travel Services"}</div>
                <div className="text-xs text-[#8a93a5]">
                  {invoice.service_detail || "As per tour management confirmation criteria"}
                </div>
              </td>
              <td className="text-right px-2.5 font-bold" style={{ color: NAVY }}>
                {money(amount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature */}
      <div className="flex items-end justify-end mt-12 print:mt-8 print-break-avoid">
        <div className="text-center">
          <img src={signatureStamp} alt="Signature" className="max-w-[160px] h-auto mx-auto print:max-w-[120px]" />
          <div className="border-t border-[#cdd3dd] pt-1 mt-1 text-sm text-[#48526a]">
            Thank you,
            <div className="font-bold" style={{ color: NAVY }}>
              Royal Georgian Tours
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
