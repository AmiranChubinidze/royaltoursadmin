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

  return (
    <div className="bg-white max-w-4xl mx-auto print:max-w-none print:mx-0 p-8 text-[#333]" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <header className="flex justify-between items-start mb-6">
        <div>
          {/* CONFIRMED Title */}
          <h1 className="text-[#2f5597] text-4xl font-bold tracking-wide mb-4" style={{ letterSpacing: '0.15em' }}>
            CONFIRMED
          </h1>
          {/* Confirmation Info Box */}
          <div className="border border-gray-300 rounded overflow-hidden">
            <div className="flex">
              <div className="bg-gray-100 px-4 py-2 text-xs text-gray-500 uppercase w-44">
                Confirmation Number
              </div>
              <div className="px-4 py-2 font-bold text-[#2f5597] text-lg">
                {confirmation.confirmation_code}
              </div>
            </div>
            <div className="flex border-t border-gray-300">
              <div className="bg-gray-100 px-4 py-2 text-xs text-gray-500 uppercase w-44">
                Confirmation Date
              </div>
              <div className="px-4 py-2 font-bold">
                {confirmation.confirmation_date}
              </div>
            </div>
          </div>
        </div>
        
        {/* Company Info */}
        <div className="text-right text-sm">
          <div className="font-bold text-base mb-1">LLC Royal Georgian Tours</div>
          <div className="text-gray-600">ID: 404515208</div>
          <div className="text-gray-600">+995 557 141 357</div>
          <div className="text-gray-600">+995 592 005 450</div>
          <div className="text-[#2f5597] font-medium">Royalgeorgiantours@gmail.com</div>
        </div>
      </header>

      {/* Blue Divider */}
      <div className="h-0.5 bg-[#2f5597] mb-6" />

      {/* Confirmed To Section */}
      <section className="mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Confirmed To:</h2>
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-gray-400 italic py-3 px-4">
                    No client data provided.
                  </td>
                </tr>
              ) : (
                clients.map((client, index) => (
                  <tr key={index} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-2.5 px-4 font-medium text-gray-800">{client.name}</td>
                    <td className="py-2.5 px-4 text-gray-600 text-right">{client.passport || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Arrival / Departure Section */}
      <section className="mb-6">
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="bg-[#dce6f1]">
                <td className="py-2.5 px-4 font-semibold text-[#2f5597] w-28">ARRIVAL</td>
                <td className="py-2.5 px-4 font-bold text-gray-800">{arrival.date || "—"}</td>
                <td className="py-2.5 px-4 text-gray-700">{arrival.time || "—"}</td>
                <td className="py-2.5 px-4 text-gray-700">{arrival.from || "—"}</td>
                <td className="py-2.5 px-4 text-gray-700">{arrival.flight || "—"}</td>
              </tr>
              <tr className="bg-white border-t border-gray-200">
                <td className="py-2.5 px-4 font-semibold text-[#2f5597] w-28">DEPARTURE</td>
                <td className="py-2.5 px-4 font-bold text-gray-800">{departure.date || "—"}</td>
                <td className="py-2.5 px-4 text-gray-700">{departure.time || "—"}</td>
                <td className="py-2.5 px-4 text-gray-700">{departure.to || "—"}</td>
                <td className="py-2.5 px-4 text-gray-700">{departure.flight || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Itinerary Section */}
      <section className="mb-6">
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#2f5597] text-white">
                <th className="py-2.5 px-4 text-left font-semibold text-xs uppercase tracking-wide w-28">Date</th>
                <th className="py-2.5 px-4 text-left font-semibold text-xs uppercase tracking-wide">Hotel</th>
                <th className="py-2.5 px-4 text-left font-semibold text-xs uppercase tracking-wide">Program / Activity</th>
                <th className="py-2.5 px-4 text-right font-semibold text-xs uppercase tracking-wide w-20">Driver</th>
              </tr>
            </thead>
            <tbody>
              {itinerary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-gray-400 italic py-3 px-4">
                    No itinerary items provided.
                  </td>
                </tr>
              ) : (
                itinerary.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-2.5 px-4 text-gray-800">{item.date || "—"}</td>
                    <td className="py-2.5 px-4 text-gray-800 uppercase">{item.hotel || "—"}</td>
                    <td className="py-2.5 px-4 text-gray-800 uppercase">{item.route || "—"}</td>
                    <td className="py-2.5 px-4 text-gray-800 text-right">{item.meals || "YES"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Services and Signature Section */}
      <div className="flex gap-6">
        {/* Services Box */}
        <section className="flex-1 border border-gray-200 rounded overflow-hidden">
          <div className="bg-[#dce6f1] px-4 py-2.5 font-semibold text-sm text-[#2f5597] uppercase tracking-wide">
            Services
          </div>
          <div className="p-4 text-sm">
            <p className="mb-3">
              Total number of days: <strong>{confirmation.total_days ?? "—"}</strong>{" "}
              Total number of nights: <strong>{confirmation.total_nights ?? "—"}</strong>
            </p>
            <ul className="space-y-1.5 text-gray-700">
              <li>• Each adult: INTERNET PACKAGE</li>
              <li>• Driver working hours: From 10:00 to 19:00</li>
              <li className="font-semibold text-gray-800">• Any changes in reservation can be subject to extra charge</li>
              <li>• Discount 10% in New Istanbul Restaurant</li>
              <li>• Discount 10% in Yemeni Restaurant in Batumi</li>
            </ul>
          </div>
        </section>

        {/* Signature and Stamp */}
        <section className="flex items-end justify-center w-48">
          <img
            src={signatureStamp}
            alt="Signature and Stamp"
            className="w-40 h-auto object-contain"
          />
        </section>
      </div>
    </div>
  );
}
