import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  ConfirmationFormData,
  Client,
  ItineraryDay,
} from "@/types/confirmation";
import { useCreateConfirmation } from "@/hooks/useConfirmations";
import { toast } from "@/hooks/use-toast";

interface ConfirmationFormProps {
  initialData?: Partial<ConfirmationFormData>;
  onSubmit?: (data: ConfirmationFormData) => void;
  isEdit?: boolean;
}

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

export function ConfirmationForm({ initialData, onSubmit, isEdit = false }: ConfirmationFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateConfirmation();

  const [formData, setFormData] = useState<ConfirmationFormData>({
    tourSource: initialData?.tourSource || "own-company",
    trackingNumber: initialData?.trackingNumber || "",
    clients: initialData?.clients || [{ name: "", passport: "" }],
    arrival: initialData?.arrival || { date: "", time: "", flight: "", from: "" },
    departure: initialData?.departure || { date: "", time: "", flight: "", to: "" },
    itinerary: initialData?.itinerary || [{ date: "", day: "", route: "", hotel: "", roomType: "", meals: "YES" }],
    services: initialData?.services || "",
    notes: initialData?.notes || "",
  });

  const showTrackingNumber = formData.tourSource === "partner-agency";

  // Auto-generate itinerary rows based on arrival/departure dates
  useEffect(() => {
    if (isEdit) return;
    
    const arrDate = parseDateDDMMYYYY(formData.arrival.date);
    const depDate = parseDateDDMMYYYY(formData.departure.date);
    
    if (arrDate && depDate) {
      const diff = Math.floor((depDate.getTime() - arrDate.getTime()) / (1000 * 60 * 60 * 24));
      const count = Math.max(1, diff + 1);
      
      const newItinerary: ItineraryDay[] = [];
      for (let i = 0; i < count; i++) {
        const existingDay = formData.itinerary[i];
        newItinerary.push({
          date: formatDateDDMMYYYY(datePlusDays(arrDate, i)),
          day: existingDay?.day || "",
          route: existingDay?.route || "",
          hotel: existingDay?.hotel || "",
          roomType: existingDay?.roomType || "",
          meals: existingDay?.meals || "YES",
        });
      }
      
      if (newItinerary.length !== formData.itinerary.length || 
          newItinerary.some((day, i) => day.date !== formData.itinerary[i]?.date)) {
        setFormData(prev => ({ ...prev, itinerary: newItinerary }));
      }
    }
  }, [formData.arrival.date, formData.departure.date, isEdit]);

  const handleSameAsArrival = () => {
    setFormData(prev => ({
      ...prev,
      departure: {
        date: prev.arrival.date,
        time: prev.arrival.time,
        flight: prev.arrival.flight,
        to: prev.arrival.from,
      },
    }));
  };

  const addClient = () => {
    setFormData(prev => ({
      ...prev,
      clients: [...prev.clients, { name: "", passport: "" }],
    }));
  };

  const updateClient = (index: number, field: keyof Client, value: string) => {
    setFormData(prev => ({
      ...prev,
      clients: prev.clients.map((client, i) =>
        i === index ? { ...client, [field]: value } : client
      ),
    }));
  };

  const addDay = () => {
    const arrDate = parseDateDDMMYYYY(formData.arrival.date);
    const presetDate = arrDate ? formatDateDDMMYYYY(datePlusDays(arrDate, formData.itinerary.length)) : "";
    
    setFormData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, { date: presetDate, day: "", route: "", hotel: "", roomType: "", meals: "YES" }],
    }));
  };

  const updateItinerary = (index: number, field: keyof ItineraryDay, value: string) => {
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.map((day, i) =>
        i === index ? { ...day, [field]: value } : day
      ),
    }));
  };

  const handleSubmit = async () => {
    const filteredData = {
      ...formData,
      clients: formData.clients.filter(c => c.name.trim() || c.passport.trim()),
      itinerary: formData.itinerary.filter(d => d.date.trim() || d.hotel.trim() || d.route.trim()),
    };

    if (onSubmit) {
      onSubmit(filteredData);
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        clients: filteredData.clients,
        arrival: filteredData.arrival,
        departure: filteredData.departure,
        itinerary: filteredData.itinerary,
        trackingNumber: filteredData.trackingNumber,
        services: filteredData.services,
        notes: filteredData.notes,
      });

      toast({
        title: "Confirmation created",
        description: `Confirmation ${result.confirmation_code} has been created.`,
      });

      navigate(`/confirmation/${result.id}`);
    } catch (error) {
      toast({
        title: "Error creating confirmation",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg shadow-sm border border-border">
          {/* Header */}
          <header className="px-6 py-5 border-b border-border">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tour confirmation</p>
            <h1 className="text-2xl font-bold text-foreground">
              {isEdit ? "Edit confirmation letter" : "Generate confirmation letter"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isEdit ? "Update and save the confirmation details." : "Fill the details below. Blank client/itinerary rows will be ignored."}
            </p>
          </header>

          <div className="p-6 space-y-8">
            {/* Trip / Confirmation info */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">Trip / Confirmation info</h2>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="tourSource" className="text-sm font-medium mb-1.5 block">Tour source</Label>
                  <Select
                    value={formData.tourSource}
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        tourSource: value,
                        trackingNumber: value === "own-company" ? "" : prev.trackingNumber
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="own-company">Own tour company</SelectItem>
                      <SelectItem value="partner-agency">Partner agency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {showTrackingNumber && (
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="trackingNumber" className="text-sm font-medium mb-1.5 block">Tracking number</Label>
                    <Input
                      id="trackingNumber"
                      type="text"
                      placeholder="Optional"
                      value={formData.trackingNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* Arrival / Departure */}
              <div className="flex flex-wrap gap-8 mt-6">
                {/* Arrival */}
                <div className="flex-1 min-w-[280px]">
                  <h3 className="font-semibold text-foreground mb-4">Arrival</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Arrival date</Label>
                      <Input
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={formData.arrival.date}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          arrival: { ...prev.arrival, date: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Arrival time</Label>
                      <Input
                        type="time"
                        value={formData.arrival.time}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          arrival: { ...prev.arrival, time: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Arrival city</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Tbilisi"
                        value={formData.arrival.from}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          arrival: { ...prev.arrival, from: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Arrival ticket number</Label>
                      <Input
                        type="text"
                        placeholder="Flight / ticket number"
                        value={formData.arrival.flight}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          arrival: { ...prev.arrival, flight: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Departure */}
                <div className="flex-1 min-w-[280px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Departure</h3>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleSameAsArrival}
                    >
                      Same as arrival
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Departure date</Label>
                      <Input
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={formData.departure.date}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          departure: { ...prev.departure, date: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Departure time</Label>
                      <Input
                        type="time"
                        value={formData.departure.time}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          departure: { ...prev.departure, time: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Departure city</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Batumi"
                        value={formData.departure.to}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          departure: { ...prev.departure, to: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Departure ticket number</Label>
                      <Input
                        type="text"
                        placeholder="Flight / ticket number"
                        value={formData.departure.flight}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          departure: { ...prev.departure, flight: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Clients */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Clients</h2>
                <p className="text-sm text-muted-foreground">Add as many as needed. Empty rows are ignored.</p>
              </div>
              
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left text-sm font-medium text-foreground px-4 py-2">Full name</th>
                      <th className="text-left text-sm font-medium text-foreground px-4 py-2">Passport number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.clients.map((client, index) => (
                      <tr key={index} className="border-b border-border/50 last:border-b-0">
                        <td className="px-4 py-2">
                          <Input
                            type="text"
                            placeholder="Full name"
                            value={client.name}
                            onChange={(e) => updateClient(index, "name", e.target.value)}
                            className="border-0 shadow-none px-0 h-8 focus-visible:ring-0"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="text"
                            placeholder="Passport number"
                            value={client.passport}
                            onChange={(e) => updateClient(index, "passport", e.target.value)}
                            className="border-0 shadow-none px-0 h-8 focus-visible:ring-0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addClient}
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add client
              </Button>
            </section>

            {/* Itinerary */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Itinerary</h2>
                <p className="text-sm text-muted-foreground">Add as many days as needed. Empty rows are ignored.</p>
              </div>

              <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left text-sm font-medium text-foreground px-4 py-2 w-28">Date</th>
                      <th className="text-left text-sm font-medium text-foreground px-4 py-2 w-36">Hotel</th>
                      <th className="text-left text-sm font-medium text-foreground px-4 py-2">Program / activity</th>
                      <th className="text-left text-sm font-medium text-foreground px-4 py-2 w-20">Driver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.itinerary.map((day, index) => (
                      <tr key={index} className="border-b border-border/50 last:border-b-0">
                        <td className="px-4 py-2">
                          <Input
                            type="text"
                            placeholder="dd/mm/yyyy"
                            value={day.date}
                            onChange={(e) => updateItinerary(index, "date", e.target.value)}
                            className="border-0 shadow-none px-0 h-8 focus-visible:ring-0 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="text"
                            placeholder="Hotel"
                            value={day.hotel}
                            onChange={(e) => updateItinerary(index, "hotel", e.target.value)}
                            className="border-0 shadow-none px-0 h-8 focus-visible:ring-0 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="text"
                            placeholder="Activity / program description"
                            value={day.route}
                            onChange={(e) => updateItinerary(index, "route", e.target.value)}
                            className="border-0 shadow-none px-0 h-8 focus-visible:ring-0 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={day.meals || "YES"}
                            onValueChange={(value) => updateItinerary(index, "meals", value)}
                          >
                            <SelectTrigger className="border-0 shadow-none px-0 h-8 focus:ring-0 text-sm w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="YES">YES</SelectItem>
                              <SelectItem value="NO">NO</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addDay}
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add day
              </Button>
            </section>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending 
                  ? "Processing..." 
                  : isEdit 
                    ? "Update confirmation" 
                    : "Generate confirmation"
                }
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
