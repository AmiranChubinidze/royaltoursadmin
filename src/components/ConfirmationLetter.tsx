import { Confirmation, ConfirmationPayload, HotelBooking, ItineraryDay } from "@/types/confirmation";
import signatureStamp from "@/assets/signature-stamp.jpg";

interface ConfirmationLetterProps {
  confirmation: Confirmation;
}

// Helper to parse DD/MM/YYYY dates
function parseDateDDMMYYYY(value: string): Date | null {
  if (!value) return null;
  const parts = value.split(/[\/\-]/);
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function datePlusDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

// Generate itinerary from hotelBookings data for display
function generateItineraryFromBookings(hotelBookings: HotelBooking[]): ItineraryDay[] {
  if (!hotelBookings || hotelBookings.length === 0) return [];

  // Sort bookings by check-in date
  const sortedBookings = [...hotelBookings].sort((a, b) => {
    const dateA = parseDateDDMMYYYY(a.checkIn);
    const dateB = parseDateDDMMYYYY(b.checkIn);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  // Find the earliest check-in and latest check-out
  const allCheckIns = sortedBookings.map((b) => parseDateDDMMYYYY(b.checkIn)).filter((d): d is Date => d !== null);
  const allCheckOuts = sortedBookings.map((b) => parseDateDDMMYYYY(b.checkOut)).filter((d): d is Date => d !== null);

  if (allCheckIns.length === 0 || allCheckOuts.length === 0) return [];

  const earliestCheckIn = new Date(Math.min(...allCheckIns.map((d) => d.getTime())));
  const latestCheckOut = new Date(Math.max(...allCheckOuts.map((d) => d.getTime())));

  // Generate itinerary days
  const itinerary: ItineraryDay[] = [];
  let currentDate = new Date(earliestCheckIn);

  while (currentDate < latestCheckOut) {
    const dateStr = formatDateDDMMYYYY(currentDate);

    // Find which hotel covers this night
    let hotelForNight: HotelBooking | undefined;
    for (const booking of sortedBookings) {
      const checkIn = parseDateDDMMYYYY(booking.checkIn);
      const checkOut = parseDateDDMMYYYY(booking.checkOut);
      if (checkIn && checkOut) {
        // Check if currentDate is >= checkIn and < checkOut
        if (currentDate >= checkIn && currentDate < checkOut) {
          hotelForNight = booking;
          break;
        }
      }
    }

    itinerary.push({
      date: dateStr,
      day: "",
      route: "",
      hotel: hotelForNight?.hotelName || "",
      roomType: hotelForNight?.roomCategory || "",
      meals: "YES", // Always YES for driver
    });

    currentDate = datePlusDays(currentDate, 1);
  }

  return itinerary;
}

export function ConfirmationLetter({ confirmation }: ConfirmationLetterProps) {
  const payload = confirmation.raw_payload as ConfirmationPayload;
  const clients = payload?.clients || [];
  const arrival = payload?.arrival || { date: "", time: "", flight: "", from: "" };
  const departure = payload?.departure || { date: "", time: "", flight: "", to: "" };
  const trackingNumber = payload?.trackingNumber;
  
  // For drafts with hotelBookings but no itinerary, generate it on-the-fly
  const hotelBookings = payload?.hotelBookings;
  let itinerary = payload?.itinerary || [];
  
  if (itinerary.length === 0 && hotelBookings && hotelBookings.length > 0) {
    itinerary = generateItineraryFromBookings(hotelBookings);
  }

  return (
    <div 
      className="confirmation-letter-print bg-white max-w-[960px] mx-auto rounded-[10px] p-[22px_26px] print:max-w-full print:mx-0 print:p-0 print:rounded-none print:shadow-none print:border-none"
      style={{ 
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.04)',
        color: '#1c1f26'
      }}
    >
      {/* Header */}
      <header className="flex justify-between gap-3 pb-1.5 mb-1 print-break-avoid print:gap-4 print:pb-2 print:mb-1">
        <div>
          {/* CONFIRMED Title */}
          <div 
            className="text-[50px] font-[800] text-[#2f5597] print:text-[36px] print:leading-tight"
            style={{ letterSpacing: '0.08em' }}
          >
            CONFIRMED
          </div>
          {/* Meta Row */}
          <div 
            className="meta-box-print grid gap-x-2 gap-y-0.5 items-center mt-0.5 border border-[#dfe3eb] rounded-lg p-[6px_8px] bg-[#f4f6fb] print:p-[4px_8px] print:gap-x-2 print:gap-y-0.5 print:mt-1"
            style={{ gridTemplateColumns: 'auto auto' }}
          >
            <div className="text-xs text-[#6b7280] print:text-[10px]" style={{ letterSpacing: '0.05em' }}>
              CONFIRMATION NUMBER
            </div>
            <div className="text-xl font-bold text-[#1c1f26] print:text-base">
              {confirmation.confirmation_code}
            </div>
            <div className="text-xs text-[#6b7280] print:text-[10px]" style={{ letterSpacing: '0.05em' }}>
              CONFIRMATION DATE
            </div>
            <div className="text-lg font-bold text-[#1c1f26] print:text-sm">
              {confirmation.confirmation_date}
            </div>
            {trackingNumber && trackingNumber.trim() !== "" && (
              <>
                <div className="text-xs text-[#6b7280] print:text-[10px]" style={{ letterSpacing: '0.05em' }}>
                  TRACKING NUMBER
                </div>
                <div className="text-lg font-bold text-[#1c1f26] print:text-sm">
                  {trackingNumber}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Company Block */}
        <div className="text-right mt-[70px] print:mt-[40px]" style={{ lineHeight: 1.4 }}>
          <div className="font-[800] text-lg print:text-[13px] print:leading-tight">LLC Royal Georgian Tours</div>
          <div className="text-[#6b7280] print:text-[11px]">ID: 404515208</div>
          <div className="print:text-[11px]">+995 557 141 357</div>
          <div className="print:text-[11px]">+995 592 005 450</div>
          <div className="font-bold text-[#2f5597] print:text-[11px]">Royalgeorgiantours@gmail.com</div>
        </div>
      </header>

      {/* Header Line */}
      <div className="border-b-2 border-[#2f5597] opacity-70 mb-3 print:mb-4" />

      {/* Confirmed To Section */}
      <section className="border border-[#dfe3eb] rounded-lg p-2 bg-white mb-[22px] print:mb-5 print-break-avoid print:p-3">
        <div className="mb-3 print:mb-3">
          <h2 className="text-lg font-semibold text-[#2f5597] m-0 print:text-base">Confirmed To:</h2>
        </div>
        <table className="w-full border border-[#dfe3eb] rounded-lg overflow-hidden" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-[#6b7280] p-[8px_10px] text-sm print:text-xs print:p-2">
                  No client data provided.
                </td>
              </tr>
            ) : (
              clients.map((client, index) => (
                <tr 
                  key={index} 
                  className={index % 2 === 0 ? "bg-[#f3f6fc] alt-row-print" : "bg-white"}
                >
                  <td className="p-[8px_10px] text-sm border-b border-[#dfe3eb] text-[#1a1d24] last:border-b-0 print:text-[12px] print:p-2">
                    {client.name}
                  </td>
                  <td className="p-[8px_10px] text-sm border-b border-[#dfe3eb] text-[#1a1d24] text-right last:border-b-0 print:text-[12px] print:p-2">
                    {client.passport || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Arrival / Departure Section */}
      <section className="border border-[#dfe3eb] rounded-lg bg-white p-0 my-5 print:my-4 print-break-avoid">
        <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td className="p-[4px_6px] font-[800] text-[#2f5597] whitespace-nowrap border-t border-b border-[#dfe3eb] text-sm w-28 print:text-[12px] print:w-24 print:p-2">
                ARRIVAL
              </td>
              <td className="p-[4px_6px] font-semibold border-t border-b border-[#dfe3eb] text-sm print:text-[12px] print:p-2">
                <strong>{arrival.date || "—"}</strong>
              </td>
              <td className="p-[4px_6px] border-t border-b border-[#dfe3eb] text-sm print:text-[12px] print:p-2">
                {arrival.time || "—"}
              </td>
              <td className="p-[4px_6px] border-t border-b border-[#dfe3eb] text-sm print:text-[12px] print:p-2">
                {arrival.from || "—"}
              </td>
              <td className="p-[4px_6px] border-t border-b border-[#dfe3eb] text-sm print:text-[12px] print:p-2">
                {arrival.flight || "—"}
              </td>
            </tr>
            <tr>
              <td className="p-[4px_6px] font-[800] text-[#2f5597] whitespace-nowrap border-b border-[#dfe3eb] text-sm w-28 print:text-[12px] print:w-24 print:p-2">
                DEPARTURE
              </td>
              <td className="p-[4px_6px] font-semibold border-b border-[#dfe3eb] text-sm print:text-[12px] print:p-2">
                <strong>{departure.date || "—"}</strong>
              </td>
              <td className="p-[4px_6px] border-b border-[#dfe3eb] text-sm print:text-[12px] print:p-2">
                {departure.time || "—"}
              </td>
              <td className="p-[4px_6px] border-b border-[#dfe3eb] text-sm print:text-[12px] print:p-2">
                {departure.to || "—"}
              </td>
              <td className="p-[4px_6px] border-b border-[#dfe3eb] text-sm print:text-[12px] print:p-2">
                {departure.flight || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Itinerary Section */}
      <section className="border border-[#dfe3eb] rounded-lg p-2 bg-white mb-7 print:mb-5 print-break-avoid print:p-2">
        <table className="w-full border border-[#dfe3eb] rounded-lg overflow-hidden" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-[#2f5597] text-white uppercase services-header-print">
              <th className="p-2.5 text-left text-sm font-semibold border border-[#dfe3eb] print:text-[11px] print:p-2">Date</th>
              <th className="p-2.5 text-left text-sm font-semibold border border-[#dfe3eb] print:text-[11px] print:p-2">Hotel</th>
              <th className="p-2.5 text-left text-sm font-semibold border border-[#dfe3eb] px-3 print:text-[11px] print:p-2">Program / Activity</th>
              <th className="p-2.5 text-center text-sm font-semibold border border-[#dfe3eb] w-20 print:text-[11px] print:p-2 print:w-16">Driver</th>
            </tr>
          </thead>
          <tbody>
            {itinerary.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-[#6b7280] p-2.5 text-sm print:text-[11px] print:p-2">
                  No itinerary items provided.
                </td>
              </tr>
            ) : (
              itinerary.map((item, index) => (
                <tr 
                  key={index} 
                  className={index % 2 === 0 ? "bg-[#f3f6fc] alt-row-print" : "bg-white"}
                >
                  <td className="p-2.5 text-sm border border-[#dfe3eb] print:text-[11px] print:p-2">{item.date || "—"}</td>
                  <td className="p-2.5 text-sm border border-[#dfe3eb] uppercase print:text-[11px] print:p-2">{item.hotel || "—"}</td>
                  <td className="p-2.5 text-sm border border-[#dfe3eb] px-3 uppercase print:text-[11px] print:p-2">{item.route || "—"}</td>
                  <td className="p-2.5 text-sm border border-[#dfe3eb] text-center print:text-[11px] print:p-2">{item.meals || "YES"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Services and Signature Section */}
      <div className="flex gap-4 items-start mt-[18px] mb-[22px] print:mt-4 print:mb-0 print:gap-4 print-break-avoid">
        {/* Services Box */}
        <section className="border border-[#dfe3eb] rounded-lg bg-white overflow-hidden flex-[0_0_55%] max-w-[55%] print:flex-[0_0_58%] print:max-w-[58%]" style={{ lineHeight: 1.6 }}>
          <div className="services-header-print bg-[#2f5597] text-white p-[8px_12px] font-bold text-sm uppercase rounded-t-lg print:text-[11px] print:p-2">
            SERVICES
          </div>
          <div className="p-[10px_12px_12px_12px] bg-white print:p-3 print:leading-normal">
            <div className="mb-2 text-sm print:text-[11px] print:mb-1">
              Total number of days: <strong>{confirmation.total_days ?? "--"}</strong>{" "}
              Total number of nights: <strong>{confirmation.total_nights ?? "--"}</strong>
            </div>
            <ul className="m-0 ml-4 p-0 text-sm space-y-0.5 print:text-[10px] print:ml-3 print:space-y-0.5 print:leading-relaxed">
              <li>Each adult: INTERNET PACKAGE</li>
              <li>Driver working hours: From 10:00 to 19:00</li>
              <li className="font-bold text-[#1b3c78]">Any changes in reservation can be subject to extra charge</li>
              <li className="text-[#c00000]">Discount 10% in New Istanbul Restaurant</li>
              <li className="text-[#c00000]">Discount 10% in Yemeni Restaurant in Batumi</li>
            </ul>
          </div>
        </section>

        {/* Signature Section */}
        <section className="flex-[0_0_45%] flex justify-center items-center text-center print:flex-[0_0_42%]">
          <div>
            <img
              src={signatureStamp}
              alt="Signature and Stamp"
              className="max-w-[220px] h-auto block mx-auto print:max-w-[140px]"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
