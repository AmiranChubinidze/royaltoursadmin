import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Copy, ArrowLeft } from "lucide-react";
import {
  ConfirmationFormData,
  Client,
  ItineraryDay,
  TOUR_SOURCES,
  Confirmation,
} from "@/types/confirmation";
import {
  useCreateConfirmation,
  useUpdateConfirmation,
} from "@/hooks/useConfirmations";
import {
  validateConfirmationData,
  generateItineraryDays,
  formatDateToDDMMYYYY,
  parseDDMMYYYY,
} from "@/lib/confirmationUtils";
import { toast } from "@/hooks/use-toast";

interface ConfirmationFormProps {
  initialData?: Confirmation | null;
  isEdit?: boolean;
}

const emptyClient: Client = { name: "", passport: "" };
const emptyItineraryDay: ItineraryDay = {
  date: "",
  day: "",
  route: "",
  hotel: "",
  roomType: "",
  meals: "",
};

export function ConfirmationForm({ initialData, isEdit }: ConfirmationFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateConfirmation();
  const updateMutation = useUpdateConfirmation();

  const [formData, setFormData] = useState<ConfirmationFormData>({
    tourSource: "",
    trackingNumber: "",
    clients: [{ ...emptyClient }],
    arrival: { date: "", time: "", flight: "", from: "" },
    departure: { date: "", time: "", flight: "", to: "" },
    itinerary: [],
    services: "",
    notes: "",
  });

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (initialData?.raw_payload) {
      const payload = initialData.raw_payload;
      setFormData({
        tourSource: initialData.tour_source || "",
        trackingNumber: payload.trackingNumber || "",
        clients: payload.clients?.length > 0 ? payload.clients : [{ ...emptyClient }],
        arrival: payload.arrival || { date: "", time: "", flight: "", from: "" },
        departure: payload.departure || { date: "", time: "", flight: "", to: "" },
        itinerary: payload.itinerary || [],
        services: payload.services || "",
        notes: payload.notes || "",
      });
    }
  }, [initialData]);

  const handleAddClient = () => {
    setFormData((prev) => ({
      ...prev,
      clients: [...prev.clients, { ...emptyClient }],
    }));
  };

  const handleRemoveClient = (index: number) => {
    if (formData.clients.length > 1) {
      setFormData((prev) => ({
        ...prev,
        clients: prev.clients.filter((_, i) => i !== index),
      }));
    }
  };

  const handleClientChange = (
    index: number,
    field: keyof Client,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      clients: prev.clients.map((client, i) =>
        i === index ? { ...client, [field]: value } : client
      ),
    }));
  };

  const handleAddItineraryDay = () => {
    setFormData((prev) => ({
      ...prev,
      itinerary: [...prev.itinerary, { ...emptyItineraryDay }],
    }));
  };

  const handleRemoveItineraryDay = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, i) => i !== index),
    }));
  };

  const handleItineraryChange = (
    index: number,
    field: keyof ItineraryDay,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      itinerary: prev.itinerary.map((day, i) =>
        i === index ? { ...day, [field]: value } : day
      ),
    }));
  };

  const handleGenerateItinerary = () => {
    if (!formData.arrival.date || !formData.departure.date) {
      toast({
        title: "Error",
        description: "Please set arrival and departure dates first",
        variant: "destructive",
      });
      return;
    }

    const days = generateItineraryDays(formData.arrival.date, formData.departure.date);
    setFormData((prev) => ({
      ...prev,
      itinerary: days.map((d) => ({
        ...emptyItineraryDay,
        date: d.date,
        day: d.day,
      })),
    }));
  };

  const handleCopyArrivalToDeparture = () => {
    setFormData((prev) => ({
      ...prev,
      departure: {
        ...prev.departure,
        flight: prev.arrival.flight,
        from: prev.arrival.from,
      },
    }));
  };

  const handleDateInput = (
    section: "arrival" | "departure",
    value: string
  ) => {
    // Auto-format as user types
    let formatted = value.replace(/\D/g, "");
    if (formatted.length > 2) {
      formatted = formatted.slice(0, 2) + "/" + formatted.slice(2);
    }
    if (formatted.length > 5) {
      formatted = formatted.slice(0, 5) + "/" + formatted.slice(5, 9);
    }
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], date: formatted },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateConfirmationData({
      arrival: formData.arrival,
      departure: formData.departure,
      clients: formData.clients,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      toast({
        title: "Validation Error",
        description: validation.errors[0],
        variant: "destructive",
      });
      return;
    }

    setErrors([]);

    // Filter empty clients and itinerary days
    const payload = {
      ...formData,
      clients: formData.clients.filter((c) => c.name.trim()),
      itinerary: formData.itinerary.filter((d) => d.route.trim() || d.hotel.trim()),
    };

    try {
      if (isEdit && initialData) {
        const result = await updateMutation.mutateAsync({
          id: initialData.id,
          payload,
        });
        navigate(`/confirmation/${result.id}`);
      } else {
        const result = await createMutation.mutateAsync(payload);
        navigate(`/confirmation/${result.id}`);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const showTrackingField = formData.tourSource && formData.tourSource !== "Direct Booking";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? "Edit Confirmation" : "New Confirmation"}
        </h1>
      </div>

      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <ul className="list-disc list-inside text-destructive text-sm">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tour Source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tour Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tourSource">Tour Source</Label>
              <Select
                value={formData.tourSource}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, tourSource: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {TOUR_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showTrackingField && (
              <div>
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      trackingNumber: e.target.value,
                    }))
                  }
                  placeholder="Booking reference"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Clients</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleAddClient}>
            <Plus className="h-4 w-4 mr-1" /> Add Client
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.clients.map((client, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Full Name</Label>
                <Input
                  value={client.name}
                  onChange={(e) => handleClientChange(index, "name", e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="flex-1">
                <Label>Passport Number</Label>
                <Input
                  value={client.passport}
                  onChange={(e) => handleClientChange(index, "passport", e.target.value)}
                  placeholder="AB1234567"
                />
              </div>
              {formData.clients.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveClient(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Arrival & Departure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Arrival</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Date (DD/MM/YYYY)</Label>
              <Input
                value={formData.arrival.date}
                onChange={(e) => handleDateInput("arrival", e.target.value)}
                placeholder="02/12/2025"
                maxLength={10}
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input
                value={formData.arrival.time}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    arrival: { ...prev.arrival, time: e.target.value },
                  }))
                }
                placeholder="14:30"
              />
            </div>
            <div>
              <Label>Flight</Label>
              <Input
                value={formData.arrival.flight}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    arrival: { ...prev.arrival, flight: e.target.value },
                  }))
                }
                placeholder="TK123"
              />
            </div>
            <div>
              <Label>From</Label>
              <Input
                value={formData.arrival.from}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    arrival: { ...prev.arrival, from: e.target.value },
                  }))
                }
                placeholder="Istanbul"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Departure</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyArrivalToDeparture}
            >
              <Copy className="h-4 w-4 mr-1" /> Same as Arrival
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Date (DD/MM/YYYY)</Label>
              <Input
                value={formData.departure.date}
                onChange={(e) => handleDateInput("departure", e.target.value)}
                placeholder="10/12/2025"
                maxLength={10}
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input
                value={formData.departure.time}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    departure: { ...prev.departure, time: e.target.value },
                  }))
                }
                placeholder="10:00"
              />
            </div>
            <div>
              <Label>Flight</Label>
              <Input
                value={formData.departure.flight}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    departure: { ...prev.departure, flight: e.target.value },
                  }))
                }
                placeholder="TK124"
              />
            </div>
            <div>
              <Label>To</Label>
              <Input
                value={formData.departure.to}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    departure: { ...prev.departure, to: e.target.value },
                  }))
                }
                placeholder="Istanbul"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Itinerary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Itinerary</CardTitle>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateItinerary}
            >
              Auto-generate Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItineraryDay}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Day
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.itinerary.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Set arrival and departure dates, then click "Auto-generate Days" or add days manually.
            </p>
          ) : (
            formData.itinerary.map((day, index) => (
              <div
                key={index}
                className="grid grid-cols-6 gap-3 items-end border-b border-border pb-4"
              >
                <div>
                  <Label>Date</Label>
                  <Input
                    value={day.date}
                    onChange={(e) =>
                      handleItineraryChange(index, "date", e.target.value)
                    }
                    placeholder="02/12"
                  />
                </div>
                <div>
                  <Label>Day</Label>
                  <Input
                    value={day.day}
                    onChange={(e) =>
                      handleItineraryChange(index, "day", e.target.value)
                    }
                    placeholder="Day 1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Route</Label>
                  <Input
                    value={day.route}
                    onChange={(e) =>
                      handleItineraryChange(index, "route", e.target.value)
                    }
                    placeholder="Tbilisi → Mtskheta → Tbilisi"
                  />
                </div>
                <div>
                  <Label>Hotel</Label>
                  <Input
                    value={day.hotel}
                    onChange={(e) =>
                      handleItineraryChange(index, "hotel", e.target.value)
                    }
                    placeholder="Marriott Tbilisi"
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Meals</Label>
                    <Input
                      value={day.meals}
                      onChange={(e) =>
                        handleItineraryChange(index, "meals", e.target.value)
                      }
                      placeholder="BB"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItineraryDay(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Services & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Services Included</Label>
            <Textarea
              value={formData.services}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, services: e.target.value }))
              }
              placeholder="English speaking guide, comfortable transport, hotel accommodations..."
              rows={3}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => navigate("/")}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : isEdit
            ? "Update Confirmation"
            : "Create Confirmation"}
        </Button>
      </div>
    </form>
  );
}
