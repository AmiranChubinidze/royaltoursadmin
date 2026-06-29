import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, BedDouble, Home, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmationPayload, ItineraryDay } from "@/types/confirmation";
import { useCreateConfirmation, useConfirmations } from "@/hooks/useConfirmations";
import { useSavedHotels } from "@/hooks/useSavedData";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import {
  parseDateDDMMYYYY,
  formatDateDDMMYYYY,
  datePlusDays,
  getOwnedRoomStays,
  takenRoomNumbers,
  roomStayKey,
  type RoomBooking,
} from "@/lib/confirmationUtils";

// The owned property cottages belong to. Must match the saved_hotels row name
// (is_owned + room_count set) for the calendar / room-conflict systems to fire.
const INN_MARTVILI = "Inn Martvili";
const COTTAGE_GREEN = "#2f6b4f";

// Local date picker (mirrors the one in ConfirmationForm; kept inline to avoid
// editing the large live tour form).
function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
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
          className={cn("w-full justify-start text-left font-normal h-10", !value && "text-muted-foreground")}
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
            if (d) onChange(formatDateDDMMYYYY(d));
            setOpen(false);
          }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export function CottageConfirmationForm() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const createMutation = useCreateConfirmation();
  const { data: savedHotels = [] } = useSavedHotels();
  const { data: allConfirmations = [] } = useConfirmations(500);

  const [guestNames, setGuestNames] = useState<string[]>([""]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [numAdults, setNumAdults] = useState(2);
  const [numKids, setNumKids] = useState(0);
  const [kidsAges, setKidsAges] = useState<number[]>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [price, setPrice] = useState<string>("");
  const [priceCurrency, setPriceCurrency] = useState<"USD" | "GEL">("USD");
  const [cottageNumbers, setCottageNumbers] = useState<number[]>([]);
  const [manualCottages, setManualCottages] = useState("");

  // The owned cottage property (set up once in Saved Data).
  const innProperty = useMemo(
    () =>
      savedHotels.find((h) => h.is_owned && h.name.trim().toLowerCase() === INN_MARTVILI.toLowerCase()) ||
      savedHotels.find((h) => h.is_owned && h.name.toLowerCase().includes("inn martvili")),
    [savedHotels]
  );
  const propertyName = innProperty?.name || INN_MARTVILI;
  const cottageCount = innProperty?.room_count ?? 0;

  // Nights = each date from check-in up to (not including) check-out.
  const nights = useMemo(() => {
    const ci = parseDateDDMMYYYY(checkIn);
    const co = parseDateDDMMYYYY(checkOut);
    if (!ci || !co || co <= ci) return [] as string[];
    const out: string[] = [];
    let cur = ci;
    while (cur < co) {
      out.push(formatDateDDMMYYYY(cur));
      cur = datePlusDays(cur, 1);
    }
    return out;
  }, [checkIn, checkOut]);

  // Cottages occupied by other bookings on overlapping nights → locked out.
  const otherBookings: RoomBooking[] = useMemo(() => {
    const res: RoomBooking[] = [];
    for (const c of allConfirmations) {
      const rp = c.raw_payload as ConfirmationPayload;
      const rn = rp?.room_numbers;
      if (!rn) continue;
      for (const stay of getOwnedRoomStays(rp.itinerary || [], savedHotels)) {
        const nums = rn[stay.stayKey];
        if (nums?.length) res.push({ hotelLower: stay.hotelName.trim().toLowerCase(), dates: stay.dates, numbers: nums });
      }
    }
    return res;
  }, [allConfirmations, savedHotels]);

  const taken = useMemo(
    () => takenRoomNumbers({ hotelName: propertyName, dates: nights }, otherBookings),
    [propertyName, nights, otherBookings]
  );

  const setKidCount = (n: number) => {
    setNumKids(n);
    setKidsAges((prev) => {
      const next = [...prev];
      next.length = n;
      return next.fill(0, prev.length).map((v) => v ?? 0);
    });
  };

  const toggleCottage = (n: number) => {
    setCottageNumbers((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)));
  };

  const updateGuest = (i: number, name: string) =>
    setGuestNames((prev) => prev.map((g, idx) => (idx === i ? name : g)));
  const addGuest = () => setGuestNames((prev) => [...prev, ""]);
  const removeGuest = (i: number) => setGuestNames((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    const chosen =
      cottageCount > 0
        ? cottageNumbers
        : manualCottages
            .split(/[,\s]+/)
            .map((s) => parseInt(s, 10))
            .filter((n) => Number.isFinite(n) && n > 0);

    const names = guestNames.map((n) => n.trim()).filter(Boolean);
    if (names.length === 0 || !checkIn || !checkOut || nights.length === 0) {
      toast({
        title: "Missing info",
        description: "At least one guest name, check-in, and a later check-out date are required.",
        variant: "destructive",
      });
      return;
    }

    const itinerary: ItineraryDay[] = nights.map((d) => ({
      date: d,
      day: "",
      route: "",
      hotel: propertyName,
      roomType: "",
      meals: "",
    }));

    const sorted = [...chosen].sort((a, b) => a - b);
    const payload: ConfirmationPayload & { tourSource?: string; price?: number | null } = {
      doc_type: "cottage",
      clients: names.map((name, i) => ({ name, passport: "", isMainGuest: i === 0 })),
      arrival: { date: checkIn, time: "", flight: "", from: "" },
      departure: { date: checkOut, time: "", flight: "", to: "" },
      itinerary,
      guestInfo: { numAdults, numKids, kidsAges: kidsAges.map((age) => ({ age: age || 0 })) },
      trackingNumber: trackingNumber.trim() || undefined,
      room_numbers: sorted.length ? { [roomStayKey(propertyName, nights[0])]: sorted } : undefined,
      price: price === "" ? null : Number(price),
      priceCurrency,
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      navigate(`/confirmation/${result.id}`);
    } catch {
      /* toast handled by the mutation */
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/")} title="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Home className="h-5 w-5" style={{ color: COTTAGE_GREEN }} />
            New Cottage Confirmation
          </h1>
          <p className="text-sm text-muted-foreground">Inn Martvili — cabins near Martvili Canyon</p>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-border/60 bg-white p-5 shadow-[0_8px_20px_rgba(15,76,92,0.06)]">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Guest name(s)</Label>
          <div className="space-y-2">
            {guestNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => updateGuest(i, e.target.value)}
                  placeholder={i === 0 ? "Main guest full name" : `Guest ${i + 1} full name`}
                />
                {guestNames.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeGuest(i)}
                    title="Remove guest"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 px-2 text-sm"
            style={{ color: COTTAGE_GREEN }}
            onClick={addGuest}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add guest
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Check-in date</Label>
            <DatePicker value={checkIn} onChange={setCheckIn} placeholder="Select check-in" />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Check-out date</Label>
            <DatePicker value={checkOut} onChange={setCheckOut} placeholder="Select check-out" />
          </div>
        </div>
        {nights.length > 0 && (
          <p className="text-xs text-muted-foreground -mt-2">
            {nights.length} {nights.length === 1 ? "night" : "nights"}
          </p>
        )}

        {/* Guests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Adults</Label>
            <Input
              type="number"
              min={1}
              value={numAdults}
              onChange={(e) => setNumAdults(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Children</Label>
            <Input
              type="number"
              min={0}
              value={numKids}
              onChange={(e) => setKidCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </div>
        </div>
        {numKids > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: numKids }, (_, i) => (
              <div key={i}>
                <Label className="text-xs text-muted-foreground mb-1 block">Child {i + 1} age</Label>
                <Input
                  type="number"
                  min={0}
                  value={kidsAges[i] ?? 0}
                  onChange={(e) =>
                    setKidsAges((prev) => {
                      const next = [...prev];
                      next[i] = parseInt(e.target.value, 10) || 0;
                      return next;
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* Cottage numbers */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BedDouble className="h-5 w-5" style={{ color: COTTAGE_GREEN }} />
            <Label className="text-sm font-semibold">Cottage number(s)</Label>
          </div>
          {cottageCount > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Greyed-out cottages are already booked on these dates.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: cottageCount }, (_, i) => i + 1).map((n) => {
                  const isSelected = cottageNumbers.includes(n);
                  const isTaken = taken.has(n) && !isSelected;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={isTaken}
                      onClick={() => toggleCottage(n)}
                      title={isTaken ? "Already booked on these dates" : undefined}
                      className={cn(
                        "h-9 min-w-[2.25rem] px-2 rounded-lg text-sm font-semibold tabular-nums border transition-colors",
                        isSelected
                          ? "text-white"
                          : isTaken
                            ? "bg-muted text-muted-foreground/40 border-transparent line-through cursor-not-allowed"
                            : "bg-white text-foreground border-border hover:border-[color:var(--cg)] hover:text-[color:var(--cg)]"
                      )}
                      style={
                        isSelected
                          ? { backgroundColor: COTTAGE_GREEN, borderColor: COTTAGE_GREEN }
                          : ({ ["--cg" as string]: COTTAGE_GREEN } as React.CSSProperties)
                      }
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Tip: add "Inn Martvili" as an owned property in Saved Data (with a cottage count) to get
                numbered cottage buttons and double-booking protection. For now, type cottage numbers:
              </p>
              <Input
                value={manualCottages}
                onChange={(e) => setManualCottages(e.target.value)}
                placeholder="e.g. 1, 2"
              />
            </>
          )}
        </div>

        {/* Tracking + price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Tracking no. (optional)</Label>
            <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. H.W" />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Price (optional)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["USD", "GEL"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPriceCurrency(c)}
                    className={cn(
                      "px-3 text-sm font-semibold transition-colors",
                      priceCurrency === c ? "text-white" : "bg-white text-foreground"
                    )}
                    style={priceCurrency === c ? { backgroundColor: COTTAGE_GREEN } : undefined}
                  >
                    {c === "USD" ? "$" : "₾"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => navigate("/")}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            style={{ backgroundColor: COTTAGE_GREEN }}
            className="text-white hover:opacity-90"
          >
            {createMutation.isPending ? "Creating…" : "Create Confirmation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
