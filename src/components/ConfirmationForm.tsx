import { useState } from "react";
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
import { Plus, Clock, ChevronDown } from "lucide-react";
import {
  ConfirmationFormData,
  Client,
  ItineraryDay,
  TOUR_SOURCES,
} from "@/types/confirmation";
import { useCreateConfirmation } from "@/hooks/useConfirmations";
import { toast } from "@/hooks/use-toast";

interface ConfirmationFormProps {
  initialData?: Partial<ConfirmationFormData>;
  onSubmit?: (data: ConfirmationFormData) => void;
  isEdit?: boolean;
}

export function ConfirmationForm({ initialData, onSubmit, isEdit = false }: ConfirmationFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateConfirmation();

  const [formData, setFormData] = useState<ConfirmationFormData>({
    tourSource: initialData?.tourSource || "",
    trackingNumber: initialData?.trackingNumber || "",
    clients: initialData?.clients || [{ name: "", passport: "" }],
    arrival: initialData?.arrival || { date: "", time: "", flight: "", from: "" },
    departure: initialData?.departure || { date: "", time: "", flight: "", to: "" },
    itinerary: initialData?.itinerary || [{ date: "", day: "", route: "", hotel: "", roomType: "", meals: "" }],
    services: initialData?.services || "",
    notes: initialData?.notes || "",
  });

  const handleSameAsArrival = () => {
    setFormData(prev => ({
      ...prev,
      departure: {
        ...prev.departure,
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
    setFormData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, { date: "", day: "", route: "", hotel: "", roomType: "", meals: "" }],
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
    // Filter out empty clients and itinerary days
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
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tour Confirmation</p>
          <h1 className="text-2xl font-bold text-foreground">Generate confirmation letter</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill the details below. Blank client/itinerary rows will be ignored.
          </p>
        </div>

        {/* Trip / Confirmation info */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-primary mb-4">Trip / Confirmation info</h2>
          
          <div className="mb-6">
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Tour source</Label>
            <Select
              value={formData.tourSource}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tourSource: value }))}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Own tour company" />
              </SelectTrigger>
              <SelectContent>
                {TOUR_SOURCES.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arrival / Departure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Arrival */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Arrival</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-orange-600 mb-1 block">Arrival date</Label>
                  <Input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formData.arrival.date}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      arrival: { ...prev.arrival, date: e.target.value }
                    }))}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-orange-600 mb-1 block">Arrival time</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="-- : -- --"
                      value={formData.arrival.time}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        arrival: { ...prev.arrival, time: e.target.value }
                      }))}
                      className="bg-white pr-10"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-orange-600 mb-1 block">Arrival city</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Tbilisi"
                    value={formData.arrival.from}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      arrival: { ...prev.arrival, from: e.target.value }
                    }))}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-orange-600 mb-1 block">Arrival ticket number</Label>
                  <Input
                    type="text"
                    placeholder="Flight / ticket number"
                    value={formData.arrival.flight}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      arrival: { ...prev.arrival, flight: e.target.value }
                    }))}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Departure */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Departure</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSameAsArrival}
                  className="text-xs"
                >
                  Same as arrival
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-orange-600 mb-1 block">Departure date</Label>
                  <Input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formData.departure.date}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      departure: { ...prev.departure, date: e.target.value }
                    }))}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-orange-600 mb-1 block">Departure time</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="-- : -- --"
                      value={formData.departure.time}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        departure: { ...prev.departure, time: e.target.value }
                      }))}
                      className="bg-white pr-10"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-orange-600 mb-1 block">Departure city</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Batumi"
                    value={formData.departure.to}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      departure: { ...prev.departure, to: e.target.value }
                    }))}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-orange-600 mb-1 block">Departure ticket number</Label>
                  <Input
                    type="text"
                    placeholder="Flight / ticket number"
                    value={formData.departure.flight}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      departure: { ...prev.departure, flight: e.target.value }
                    }))}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Clients */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Clients</h2>
            <p className="text-xs text-orange-600">Add as many as needed. Empty rows are ignored.</p>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Label className="text-sm font-semibold text-foreground">Full name</Label>
              <Label className="text-sm font-semibold text-foreground">Passport number</Label>
            </div>
            
            {formData.clients.map((client, index) => (
              <div key={index} className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Full name"
                  value={client.name}
                  onChange={(e) => updateClient(index, "name", e.target.value)}
                  className="bg-white"
                />
                <Input
                  type="text"
                  placeholder="Passport number"
                  value={client.passport}
                  onChange={(e) => updateClient(index, "passport", e.target.value)}
                  className="bg-white"
                />
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addClient}
            className="mt-3 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add client
          </Button>
        </section>

        {/* Itinerary */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Itinerary</h2>
            <p className="text-xs text-orange-600">Add as many days as needed. Empty rows are ignored.</p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[100px_1fr_2fr_100px] gap-4">
              <Label className="text-sm font-semibold text-foreground">Date</Label>
              <Label className="text-sm font-semibold text-foreground">Hotel</Label>
              <Label className="text-sm font-semibold text-foreground">Program / activity</Label>
              <Label className="text-sm font-semibold text-foreground">Driver</Label>
            </div>

            {formData.itinerary.map((day, index) => (
              <div key={index} className="grid grid-cols-[100px_1fr_2fr_100px] gap-4">
                <Input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={day.date}
                  onChange={(e) => updateItinerary(index, "date", e.target.value)}
                  className="bg-white text-sm"
                />
                <Input
                  type="text"
                  placeholder="Hotel"
                  value={day.hotel}
                  onChange={(e) => updateItinerary(index, "hotel", e.target.value)}
                  className="bg-white text-sm"
                />
                <Input
                  type="text"
                  placeholder="Activity / program description"
                  value={day.route}
                  onChange={(e) => updateItinerary(index, "route", e.target.value)}
                  className="bg-white text-sm"
                />
                <Select
                  value={day.meals || "YES"}
                  onValueChange={(value) => updateItinerary(index, "meals", value)}
                >
                  <SelectTrigger className="bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDay}
            className="mt-3 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add day
          </Button>
        </section>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createMutation.isPending ? "Creating..." : "Generate confirmation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
