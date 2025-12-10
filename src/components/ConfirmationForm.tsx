import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, ArrowLeft, CalendarIcon, Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import {
  ConfirmationFormData,
  Client,
  ItineraryDay,
} from "@/types/confirmation";
import { useCreateConfirmation } from "@/hooks/useConfirmations";
import { useSavedHotels, useSavedClients } from "@/hooks/useSavedData";
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

// Date Picker Component
function DatePicker({ 
  value, 
  onChange, 
  placeholder = "Select date" 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = parseDateDDMMYYYY(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={(d) => {
            if (d) {
              onChange(formatDateDDMMYYYY(d));
            }
            setOpen(false);
          }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

// Hotel Combobox Component
function HotelCombobox({
  value,
  onChange,
  hotels,
}: {
  value: string;
  onChange: (value: string) => void;
  hotels: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8 border-0 shadow-none px-0 focus-visible:ring-0 text-sm font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || "Select hotel..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search hotels..." />
          <CommandList>
            <CommandEmpty>No hotel found. Type to add custom.</CommandEmpty>
            <CommandGroup>
              {hotels.map((hotel) => (
                <CommandItem
                  key={hotel.id}
                  value={hotel.name}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === hotel.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {hotel.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="p-2 border-t border-border">
          <Input
            placeholder="Or type custom hotel name..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Client Combobox Component
function ClientCombobox({
  value,
  onChange,
  clients,
  onSelectClient,
}: {
  value: string;
  onChange: (value: string) => void;
  clients: { id: string; full_name: string; passport_number: string | null }[];
  onSelectClient?: (client: { full_name: string; passport_number: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8 border-0 shadow-none px-0 focus-visible:ring-0 text-sm font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || "Select client..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search clients..." />
          <CommandList>
            <CommandEmpty>No client found. Type to add custom.</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.full_name}
                  onSelect={() => {
                    if (onSelectClient) {
                      onSelectClient(client);
                    } else {
                      onChange(client.full_name);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.full_name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{client.full_name}</span>
                    {client.passport_number && (
                      <span className="text-xs text-muted-foreground">{client.passport_number}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="p-2 border-t border-border">
          <Input
            placeholder="Or type custom name..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ConfirmationForm({ initialData, onSubmit, isEdit = false }: ConfirmationFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateConfirmation();
  const { data: savedHotels = [] } = useSavedHotels();
  const { data: savedClients = [] } = useSavedClients();

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

  const removeClient = (index: number) => {
    if (formData.clients.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      clients: prev.clients.filter((_, i) => i !== index),
    }));
  };

  const selectSavedClient = (index: number, savedClient: { full_name: string; passport_number: string | null }) => {
    setFormData(prev => ({
      ...prev,
      clients: prev.clients.map((client, i) =>
        i === index ? { name: savedClient.full_name, passport: savedClient.passport_number || "" } : client
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

  const removeDay = (index: number) => {
    if (formData.itinerary.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, i) => i !== index),
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
            <div className="flex items-center gap-4 mb-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Tour confirmation</p>
                <h1 className="text-2xl font-bold text-foreground">
                  {isEdit ? "Edit confirmation letter" : "Generate confirmation letter"}
                </h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              {isEdit ? "Update and save the confirmation details." : "Fill the details below. Blank client/itinerary rows will be ignored."}
            </p>
          </header>

          <div className="p-6 space-y-8">
            {/* Trip / Confirmation info */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">Trip / Confirmation info</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
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
                  <div>
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

              {/* Arrival / Departure - Grid aligned */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Arrival */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Arrival</h3>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Date</Label>
                    <DatePicker
                      value={formData.arrival.date}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        arrival: { ...prev.arrival, date: value }
                      }))}
                      placeholder="Select arrival date"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Time</Label>
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
                    <Label className="text-sm font-medium mb-1.5 block">City</Label>
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
                    <Label className="text-sm font-medium mb-1.5 block">Flight / Ticket number</Label>
                    <Input
                      type="text"
                      placeholder="Flight or ticket number"
                      value={formData.arrival.flight}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        arrival: { ...prev.arrival, flight: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {/* Departure */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
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
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Date</Label>
                    <DatePicker
                      value={formData.departure.date}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        departure: { ...prev.departure, date: value }
                      }))}
                      placeholder="Select departure date"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Time</Label>
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
                    <Label className="text-sm font-medium mb-1.5 block">City</Label>
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
                    <Label className="text-sm font-medium mb-1.5 block">Flight / Ticket number</Label>
                    <Input
                      type="text"
                      placeholder="Flight or ticket number"
                      value={formData.departure.flight}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        departure: { ...prev.departure, flight: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Clients */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Clients</h2>
                <p className="text-sm text-muted-foreground">Select from saved or type new</p>
              </div>
              
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left text-sm font-medium text-foreground px-4 py-3">Full name</th>
                      <th className="text-left text-sm font-medium text-foreground px-4 py-3">Passport number</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.clients.map((client, index) => (
                      <tr key={index} className="border-b border-border/50 last:border-b-0">
                        <td className="px-4 py-2">
                          <ClientCombobox
                            value={client.name}
                            onChange={(value) => updateClient(index, "name", value)}
                            clients={savedClients}
                            onSelectClient={(saved) => selectSavedClient(index, saved)}
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
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeClient(index)}
                            disabled={formData.clients.length <= 1}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                <p className="text-sm text-muted-foreground">Auto-generated from dates</p>
              </div>

              <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left text-sm font-medium text-foreground px-4 py-3 w-28">Date</th>
                      <th className="text-left text-sm font-medium text-foreground px-4 py-3 w-40">Hotel</th>
                      <th className="text-left text-sm font-medium text-foreground px-4 py-3">Program / Activity</th>
                      <th className="text-left text-sm font-medium text-foreground px-4 py-3 w-24">Driver</th>
                      <th className="w-10"></th>
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
                          <HotelCombobox
                            value={day.hotel}
                            onChange={(value) => updateItinerary(index, "hotel", value)}
                            hotels={savedHotels}
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
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDay(index)}
                            disabled={formData.itinerary.length <= 1}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                size="lg"
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
