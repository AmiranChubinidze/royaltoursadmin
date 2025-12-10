import { Confirmation, ConfirmationPayload } from "@/types/confirmation";
import signatureStamp from "@/assets/signature-stamp.jpg";

interface ConfirmationLetterProps {
  confirmation: Confirmation;
}

export function ConfirmationLetter({ confirmation }: ConfirmationLetterProps) {
  const payload = confirmation.raw_payload as ConfirmationPayload;
  const clients = payload?.clients || [];
  const arrival = payload?.arrival || { date: "", time: "", flight: "", from: "" };
  const departure = payload?.departure || { date: "", time: "", flight: "", to: "" };
  const itinerary = payload?.itinerary || [];
  const trackingNumber = payload?.trackingNumber;

  return (
    <div 
      className="confirmation-letter-print bg-white max-w-[960px] mx-auto rounded-[10px] p-[22px_26px] print:max-w-full print:mx-0 print:p-0 print:rounded-none print:shadow-none"
      style={{ 
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.04)',
        color: '#1c1f26'
      }}
    >
      {/* Header */}
      <header className="flex justify-between gap-5 pb-2.5 mb-1.5 print-break-avoid">
        <div>
          {/* CONFIRMED Title */}
          <div 
            className="text-[50px] font-[800] text-[#2f5597] print:text-[42px]"
            style={{ letterSpacing: '0.08em' }}
          >
            CONFIRMED
          </div>
          {/* Meta Row */}
          <div 
            className="meta-box-print grid gap-x-2.5 gap-y-1 items-center mt-0.5 border border-[#dfe3eb] rounded-lg p-[6px_8px] bg-[#f4f6fb]"
            style={{ gridTemplateColumns: 'auto auto' }}
          >
            <div className="text-xs text-[#6b7280]" style={{ letterSpacing: '0.05em' }}>
              CONFIRMATION NUMBER
            </div>
            <div className="text-xl font-bold text-[#1c1f26] print:text-lg">
              {confirmation.confirmation_code}
            </div>
            <div className="text-xs text-[#6b7280]" style={{ letterSpacing: '0.05em' }}>
              CONFIRMATION DATE
            </div>
            <div className="text-lg font-bold text-[#1c1f26] print:text-base">
              {confirmation.confirmation_date}
            </div>
            {trackingNumber && trackingNumber.trim() !== "" && (
              <>
                <div className="text-xs text-[#6b7280]" style={{ letterSpacing: '0.05em' }}>
                  TRACKING NUMBER
                </div>
                <div className="text-lg font-bold text-[#1c1f26] print:text-base">
                  {trackingNumber}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Company Block */}
        <div className="text-right mt-[70px] print:mt-[50px]" style={{ lineHeight: 1.4 }}>
          <div className="font-[800] text-lg print:text-base">LLC Royal Georgian Tours</div>
          <div className="text-[#6b7280] print:text-sm">ID: 404515208</div>
          <div className="print:text-sm">+995 557 141 357</div>
          <div className="print:text-sm">+995 592 005 450</div>
          <div className="font-bold print:text-sm">Royalgeorgiantours@gmail.com</div>
        </div>
      </header>

      {/* Header Line */}
      <div className="border-b-2 border-[#2f5597] opacity-70 mb-3" />

      {/* Confirmed To Section */}
      <section className="border border-[#dfe3eb] rounded-lg p-2 bg-white mb-[22px] print:mb-4 print-break-avoid">
        <div className="mb-3 print:mb-2">
          <h2 className="text-lg font-semibold text-[#2f5597] m-0 print:text-base">Confirmed To:</h2>
        </div>
        <table className="w-full border border-[#dfe3eb] rounded-lg overflow-hidden" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-[#6b7280] p-[8px_10px] text-sm print:text-xs print:p-1.5">
                  No client data provided.
                </td>
              </tr>
            ) : (
              clients.map((client, index) => (
                <tr 
                  key={index} 
                  className={index % 2 === 0 ? "bg-[#f3f6fc] alt-row-print" : "bg-white"}
                >
                  <td className="p-[8px_10px] text-sm border-b border-[#dfe3eb] text-[#1a1d24] last:border-b-0 print:text-xs print:p-1.5">
                    {client.name}
                  </td>
                  <td className="p-[8px_10px] text-sm border-b border-[#dfe3eb] text-[#1a1d24] text-right last:border-b-0 print:text-xs print:p-1.5">
                    {client.passport || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Arrival / Departure Section */}
      <section className="border border-[#dfe3eb] rounded-lg bg-white p-0 my-5 print:my-3 print-break-avoid">
        <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td className="p-[4px_6px] font-[800] text-[#2f5597] whitespace-nowrap border-t border-b border-[#dfe3eb] text-sm w-28 print:text-xs print:w-20 print:p-1">
                ARRIVAL
              </td>
              <td className="p-[4px_6px] font-semibold border-t border-b border-[#dfe3eb] text-sm print:text-xs print:p-1">
                <strong>{arrival.date || "—"}</strong>
              </td>
              <td className="p-[4px_6px] border-t border-b border-[#dfe3eb] text-sm print:text-xs print:p-1">
                {arrival.time || "—"}
              </td>
              <td className="p-[4px_6px] border-t border-b border-[#dfe3eb] text-sm print:text-xs print:p-1">
                {arrival.from || "—"}
              </td>
              <td className="p-[4px_6px] border-t border-b border-[#dfe3eb] text-sm print:text-xs print:p-1">
                {arrival.flight || "—"}
              </td>
            </tr>
            <tr>
              <td className="p-[4px_6px] font-[800] text-[#2f5597] whitespace-nowrap border-b border-[#dfe3eb] text-sm w-28 print:text-xs print:w-20 print:p-1">
                DEPARTURE
              </td>
              <td className="p-[4px_6px] font-semibold border-b border-[#dfe3eb] text-sm print:text-xs print:p-1">
                <strong>{departure.date || "—"}</strong>
              </td>
              <td className="p-[4px_6px] border-b border-[#dfe3eb] text-sm print:text-xs print:p-1">
                {departure.time || "—"}
              </td>
              <td className="p-[4px_6px] border-b border-[#dfe3eb] text-sm print:text-xs print:p-1">
                {departure.to || "—"}
              </td>
              <td className="p-[4px_6px] border-b border-[#dfe3eb] text-sm print:text-xs print:p-1">
                {departure.flight || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Itinerary Section */}
      <section className="border border-[#dfe3eb] rounded-lg p-2 bg-white mb-7 print:mb-4 print-break-avoid">
        <table className="w-full border border-[#dfe3eb] rounded-lg overflow-hidden" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-[#2f5597] text-white uppercase services-header-print">
              <th className="p-2.5 text-left text-sm font-semibold border border-[#dfe3eb] print:text-xs print:p-1.5">Date</th>
              <th className="p-2.5 text-left text-sm font-semibold border border-[#dfe3eb] print:text-xs print:p-1.5">Hotel</th>
              <th className="p-2.5 text-left text-sm font-semibold border border-[#dfe3eb] px-3 print:text-xs print:p-1.5">Program / Activity</th>
              <th className="p-2.5 text-center text-sm font-semibold border border-[#dfe3eb] w-20 print:text-xs print:p-1.5 print:w-14">Driver</th>
            </tr>
          </thead>
          <tbody>
            {itinerary.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-[#6b7280] p-2.5 text-sm print:text-xs print:p-1.5">
                  No itinerary items provided.
                </td>
              </tr>
            ) : (
              itinerary.map((item, index) => (
                <tr 
                  key={index} 
                  className={index % 2 === 0 ? "bg-[#f3f6fc] alt-row-print" : "bg-white"}
                >
                  <td className="p-2.5 text-sm border border-[#dfe3eb] print:text-xs print:p-1.5">{item.date || "—"}</td>
                  <td className="p-2.5 text-sm border border-[#dfe3eb] uppercase print:text-xs print:p-1.5">{item.hotel || "—"}</td>
                  <td className="p-2.5 text-sm border border-[#dfe3eb] px-3 uppercase print:text-xs print:p-1.5">{item.route || "—"}</td>
                  <td className="p-2.5 text-sm border border-[#dfe3eb] text-center print:text-xs print:p-1.5">{item.meals || "YES"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Services and Signature Section */}
      <div className="flex gap-4 items-start mt-[18px] mb-[22px] print:mt-3 print:mb-0 print-break-avoid">
        {/* Services Box */}
        <section className="border border-[#dfe3eb] rounded-lg bg-white overflow-hidden flex-[0_0_50%] max-w-[50%]" style={{ lineHeight: 1.6 }}>
          <div className="services-header-print bg-[#2f5597] text-white p-[8px_12px] font-bold text-sm uppercase rounded-t-lg print:text-xs print:p-1.5">
            SERVICES
          </div>
          <div className="p-[10px_12px_12px_12px] bg-white print:p-2">
            <div className="mb-2 text-sm print:text-xs print:mb-1">
              Total number of days: <strong>{confirmation.total_days ?? "--"}</strong>{" "}
              Total number of nights: <strong>{confirmation.total_nights ?? "--"}</strong>
            </div>
            <ul className="m-0 ml-4 p-0 text-sm space-y-0.5 print:text-xs print:ml-3 print:space-y-0">
              <li>Each adult: INTERNET PACKAGE</li>
              <li>Driver working hours: From 10:00 to 19:00</li>
              <li className="font-bold text-[#1b3c78]">Any changes in reservation can be subject to extra charge</li>
              <li className="text-[#c00000]">Discount 10% in New Istanbul Restaurant</li>
              <li className="text-[#c00000]">Discount 10% in Yemeni Restaurant in Batumi</li>
            </ul>
          </div>
        </section>

        {/* Signature Section */}
        <section className="flex-[0_0_50%] flex justify-center items-center text-center">
          <div>
            <img
              src={signatureStamp}
              alt="Signature and Stamp"
              className="max-w-[220px] h-auto block mx-auto print:max-w-[180px]"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
