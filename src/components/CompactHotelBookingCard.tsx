import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse, isValid } from "date-fns";

export interface HotelBooking {
  hotelName: string;
  hotelEmail: string;
  checkIn: string;
  checkOut: string;
  numAdults: number;
  numKids: number;
  mealType: "BB" | "FB";
  roomCategory: "Standard" | "Upgrade";
}

interface CompactHotelBookingCardProps {
  booking: HotelBooking;
  index: number;
  onChange: (booking: HotelBooking) => void;
  onRemove: () => void;
  canRemove: boolean;
  isCheckInLinked?: boolean;
  savedHotels: { name: string; email: string }[];
}

const parseDateDDMMYYYY = (value: string): Date | null => {
  if (!value) return null;
  const parsed = parse(value, "dd/MM/yyyy", new Date());
  return isValid(parsed) ? parsed : null;
};

const formatDateDDMMYYYY = (date: Date): string => {
  return format(date, "dd/MM/yyyy");
};

const DatePicker = ({
  value,
  onChange,
  placeholder,
  isLinked,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  isLinked?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const dateValue = parseDateDDMMYYYY(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-8 text-xs",
            !value && "text-muted-foreground",
            isLinked && "border-primary/50 bg-primary/5"
          )}
        >
          {isLinked && <Link2 className="h-3 w-3 mr-1 text-primary" />}
          <CalendarIcon className="mr-1 h-3 w-3" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue || undefined}
          onSelect={(date) => {
            if (date) {
              onChange(formatDateDDMMYYYY(date));
            }
            setOpen(false);
          }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};

export const CompactHotelBookingCard = ({
  booking,
  index,
  onChange,
  onRemove,
  canRemove,
  isCheckInLinked = false,
  savedHotels,
}: CompactHotelBookingCardProps) => {
  const updateField = <K extends keyof HotelBooking>(field: K, value: HotelBooking[K]) => {
    onChange({ ...booking, [field]: value });
  };

  const handleHotelSelect = (hotelName: string) => {
    const hotel = savedHotels.find((h) => h.name === hotelName);
    if (hotel) {
      onChange({
        ...booking,
        hotelName: hotel.name,
        hotelEmail: hotel.email,
      });
    } else {
      updateField("hotelName", hotelName);
    }
  };

  return (
    <Card className="p-3 min-w-[200px] w-[200px] flex-shrink-0 relative bg-card border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">Hotel {index + 1}</span>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Hotel Name */}
      <div className="mb-2">
        <Input
          list={`hotels-${index}`}
          value={booking.hotelName}
          onChange={(e) => handleHotelSelect(e.target.value)}
          placeholder="Hotel name"
          className="h-8 text-xs font-medium"
        />
        <datalist id={`hotels-${index}`}>
          {savedHotels.map((hotel) => (
            <option key={hotel.name} value={hotel.name} />
          ))}
        </datalist>
      </div>

      {/* Dates */}
      <div className="space-y-2 mb-3">
        <div>
          <Label className="text-[10px] text-muted-foreground">Check-in</Label>
          <DatePicker
            value={booking.checkIn}
            onChange={(val) => updateField("checkIn", val)}
            placeholder="Check-in"
            isLinked={isCheckInLinked}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Check-out</Label>
          <DatePicker
            value={booking.checkOut}
            onChange={(val) => updateField("checkOut", val)}
            placeholder="Check-out"
          />
        </div>
      </div>

      {/* Guests */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <Label className="text-[10px] text-muted-foreground">Adults</Label>
          <Input
            type="number"
            min={1}
            value={booking.numAdults}
            onChange={(e) => updateField("numAdults", parseInt(e.target.value) || 1)}
            className="h-7 text-xs text-center"
          />
        </div>
        <div className="flex-1">
          <Label className="text-[10px] text-muted-foreground">Kids</Label>
          <Input
            type="number"
            min={0}
            value={booking.numKids}
            onChange={(e) => updateField("numKids", parseInt(e.target.value) || 0)}
            className="h-7 text-xs text-center"
          />
        </div>
      </div>

      {/* Meal Type Toggle */}
      <div className="mb-2">
        <Label className="text-[10px] text-muted-foreground">Meal</Label>
        <div className="flex gap-1 mt-1">
          <Button
            type="button"
            size="sm"
            variant={booking.mealType === "BB" ? "default" : "outline"}
            className="flex-1 h-6 text-[10px]"
            onClick={() => updateField("mealType", "BB")}
          >
            BB
          </Button>
          <Button
            type="button"
            size="sm"
            variant={booking.mealType === "FB" ? "default" : "outline"}
            className="flex-1 h-6 text-[10px]"
            onClick={() => updateField("mealType", "FB")}
          >
            FB
          </Button>
        </div>
      </div>

      {/* Room Category Toggle */}
      <div>
        <Label className="text-[10px] text-muted-foreground">Room</Label>
        <div className="flex gap-1 mt-1">
          <Button
            type="button"
            size="sm"
            variant={booking.roomCategory === "Standard" ? "default" : "outline"}
            className="flex-1 h-6 text-[10px]"
            onClick={() => updateField("roomCategory", "Standard")}
          >
            Std
          </Button>
          <Button
            type="button"
            size="sm"
            variant={booking.roomCategory === "Upgrade" ? "default" : "outline"}
            className="flex-1 h-6 text-[10px]"
            onClick={() => updateField("roomCategory", "Upgrade")}
          >
            Upg
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CompactHotelBookingCard;
