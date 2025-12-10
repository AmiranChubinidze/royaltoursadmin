import { Confirmation, ConfirmationPayload, COMPANY_INFO } from "@/types/confirmation";

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
    <div className="bg-white max-w-4xl mx-auto print:max-w-none print:mx-0">
      {/* Header */}
      <header className="flex justify-between items-start mb-4 pb-4">
        <div>
          <div className="inline-block bg-emerald-600 text-white font-bold text-lg px-4 py-1 mb-3">
            CONFIRMED
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div className="text-muted-foreground uppercase text-xs">Confirmation Number</div>
            <div className="font-bold text-primary text-lg">{confirmation.confirmation_code}</div>
            <div className="text-muted-foreground uppercase text-xs">Confirmation Date</div>
            <div>{confirmation.confirmation_date}</div>
            {trackingNumber && trackingNumber.trim() !== "" && (
              <>
                <div className="text-muted-foreground uppercase text-xs">Tracking Number</div>
                <div>{trackingNumber}</div>
              </>
            )}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-bold text-base">{COMPANY_INFO.name}</div>
          <div className="text-muted-foreground">ID: 405449063</div>
          <div>{COMPANY_INFO.phone}</div>
          <div>+995 571 021 021</div>
          <div className="text-primary">{COMPANY_INFO.email}</div>
        </div>
      </header>

      <div className="border-t-2 border-primary mb-6" />

      {/* Confirmed To Section */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">Confirmed To:</h2>
        <table className="w-full text-sm">
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-muted-foreground italic py-2">
                  No client data provided.
                </td>
              </tr>
            ) : (
              clients.map((client, index) => (
                <tr key={index} className="border-b border-muted/30">
                  <td className="py-2 font-medium">{client.name}</td>
                  <td className="py-2 text-muted-foreground">{client.passport || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Arrival / Departure Section */}
      <section className="mb-6">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-muted/30">
              <td className="py-2 font-semibold text-muted-foreground w-24">ARRIVAL</td>
              <td className="py-2 font-bold">{arrival.date || "—"}</td>
              <td className="py-2">{arrival.time || "—"}</td>
              <td className="py-2">{arrival.from || "—"}</td>
              <td className="py-2">{arrival.flight || "—"}</td>
            </tr>
            <tr className="border-b border-muted/30">
              <td className="py-2 font-semibold text-muted-foreground w-24">DEPARTURE</td>
              <td className="py-2 font-bold">{departure.date || "—"}</td>
              <td className="py-2">{departure.time || "—"}</td>
              <td className="py-2">{departure.to || "—"}</td>
              <td className="py-2">{departure.flight || "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Itinerary Section */}
      <section className="mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-foreground/20">
              <th className="py-2 text-left font-semibold text-muted-foreground uppercase text-xs">Date</th>
              <th className="py-2 text-left font-semibold text-muted-foreground uppercase text-xs">Hotel</th>
              <th className="py-2 text-left font-semibold text-muted-foreground uppercase text-xs">Program / Activity</th>
              <th className="py-2 text-center font-semibold text-muted-foreground uppercase text-xs w-20">Driver</th>
            </tr>
          </thead>
          <tbody>
            {itinerary.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted-foreground italic py-2">
                  No itinerary items provided.
                </td>
              </tr>
            ) : (
              itinerary.map((item, index) => (
                <tr key={index} className="border-b border-muted/30">
                  <td className="py-2">{item.date || "—"}</td>
                  <td className="py-2">{item.hotel || "—"}</td>
                  <td className="py-2">{item.route || "—"}</td>
                  <td className="py-2 text-center">{item.meals || "YES"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Services and Signature Section */}
      <div className="grid grid-cols-[1fr_auto] gap-8">
        <section className="border border-muted/50 rounded">
          <div className="bg-muted/30 px-4 py-2 font-semibold text-sm border-b border-muted/50">
            SERVICES
          </div>
          <div className="p-4 text-sm">
            <div className="flex gap-8 mb-4">
              <span>
                Total number of days: <strong>{confirmation.total_days ?? "--"}</strong>
              </span>
              <span>
                Total number of nights: <strong>{confirmation.total_nights ?? "--"}</strong>
              </span>
            </div>
            <ul className="space-y-1 text-sm">
              <li>• Each adult: INTERNET PACKAGE</li>
              <li>• Driver working hours: From 10:00 to 19:00</li>
              <li className="font-medium">• Any changes in reservation can be subject to extra charge</li>
              <li className="text-red-600">• Discount 10% in New Istanbul Restaurant</li>
              <li className="text-red-600">• Discount 10% in Yemeni Restaurant in Batumi</li>
            </ul>
          </div>
        </section>

        <section className="flex items-end">
          <div className="text-center">
            <img
              src="/signature.jpg"
              alt="Signature"
              className="h-16 w-auto mb-2"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="border-t border-foreground/30 pt-1 text-xs text-muted-foreground">
              Authorized Signature
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
