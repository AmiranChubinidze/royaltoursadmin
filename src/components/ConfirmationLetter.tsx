import { Confirmation, COMPANY_INFO } from "@/types/confirmation";

interface ConfirmationLetterProps {
  confirmation: Confirmation;
}

export function ConfirmationLetter({ confirmation }: ConfirmationLetterProps) {
  const payload = confirmation.raw_payload;

  return (
    <div className="confirmation-letter bg-card border border-border rounded-lg shadow-sm print:shadow-none print:border-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-4 border-primary">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">CONFIRMED</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tour Confirmation Letter
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold text-foreground">{COMPANY_INFO.name}</h2>
          <p className="text-sm text-muted-foreground">{COMPANY_INFO.email}</p>
          <p className="text-sm text-muted-foreground">{COMPANY_INFO.phone}</p>
        </div>
      </div>

      {/* Confirmation Code & Date */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-primary/5 rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Confirmation Code</p>
          <p className="text-2xl font-bold text-primary">{confirmation.confirmation_code}</p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
          <p className="text-lg font-medium text-foreground">{confirmation.confirmation_date}</p>
          {payload.trackingNumber && (
            <p className="text-sm text-muted-foreground mt-1">
              Ref: {payload.trackingNumber}
            </p>
          )}
        </div>
      </div>

      {/* Clients */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
          Confirmed To
        </h3>
        <div className="space-y-1">
          {payload.clients?.map((client, index) => (
            <div key={index} className="flex items-center gap-3 text-foreground">
              <span className="font-medium">{client.name}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground font-mono text-sm">{client.passport}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Arrival & Departure */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
            Arrival
          </h4>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{payload.arrival?.date}</p>
            {payload.arrival?.time && (
              <p className="text-muted-foreground">Time: {payload.arrival.time}</p>
            )}
            {payload.arrival?.flight && (
              <p className="text-muted-foreground">Flight: {payload.arrival.flight}</p>
            )}
            {payload.arrival?.from && (
              <p className="text-muted-foreground">From: {payload.arrival.from}</p>
            )}
          </div>
        </div>
        <div className="border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
            Departure
          </h4>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{payload.departure?.date}</p>
            {payload.departure?.time && (
              <p className="text-muted-foreground">Time: {payload.departure.time}</p>
            )}
            {payload.departure?.flight && (
              <p className="text-muted-foreground">Flight: {payload.departure.flight}</p>
            )}
            {payload.departure?.to && (
              <p className="text-muted-foreground">To: {payload.departure.to}</p>
            )}
          </div>
        </div>
      </div>

      {/* Itinerary */}
      {payload.itinerary && payload.itinerary.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
            Itinerary
          </h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Day</th>
                  <th className="px-3 py-2 text-left font-medium">Route</th>
                  <th className="px-3 py-2 text-left font-medium">Hotel</th>
                  <th className="px-3 py-2 text-left font-medium">Meals</th>
                </tr>
              </thead>
              <tbody>
                {payload.itinerary.map((day, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-card" : "bg-muted/30"}
                  >
                    <td className="px-3 py-2 text-muted-foreground">{day.date}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{day.day}</td>
                    <td className="px-3 py-2 text-foreground">{day.route}</td>
                    <td className="px-3 py-2 text-foreground">{day.hotel}</td>
                    <td className="px-3 py-2 text-muted-foreground">{day.meals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Services */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2">
          {payload.services && (
            <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-4">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                Services Included
              </h4>
              <p className="text-sm text-foreground whitespace-pre-line">
                {payload.services}
              </p>
            </div>
          )}
          {payload.notes && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Notes
              </h4>
              <p className="text-sm text-foreground whitespace-pre-line">
                {payload.notes}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center justify-end">
          <div className="text-center">
            <div className="border border-border rounded-lg p-4 bg-muted/30 mb-2">
              <p className="text-sm font-medium text-foreground">
                {confirmation.total_days} Days / {confirmation.total_nights} Nights
              </p>
            </div>
            <div className="h-16 w-32 border-2 border-dashed border-primary/30 rounded flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Stamp</span>
            </div>
            <div className="mt-2 border-t border-primary pt-2 w-32">
              <p className="text-xs text-muted-foreground">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          {COMPANY_INFO.name} • {COMPANY_INFO.email} • {COMPANY_INFO.phone}
        </p>
      </div>
    </div>
  );
}
