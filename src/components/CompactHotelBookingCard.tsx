import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, Link2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse, isValid } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  id: string;
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
            "w-full justify-start text-left font-normal h-9 text-sm border-border/60 bg-background/50",
            !value && "text-muted-foreground",
            isLinked && "border-primary/40 bg-primary/5"
          )}
        >
          {isLinked && <Link2 className="h-3 w-3 mr-1.5 text-primary" />}
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
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
  id,
  onChange,
  onRemove,
  canRemove,
  isCheckInLinked = false,
  savedHotels,
}: CompactHotelBookingCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 min-w-[220px] w-[220px] flex-shrink-0 relative transition-all duration-200",
        "bg-gradient-to-b from-card to-card/80 border-border/50",
        "hover:border-primary/30 hover:shadow-md",
        isDragging && "opacity-50 shadow-xl scale-105 z-50 border-primary"
      )}
    >
      {/* Header with drag handle */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-muted/50 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-semibold text-primary/80 uppercase tracking-wide">
            Stop {index + 1}
          </span>
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Hotel Name */}
      <div className="mb-3">
        <Input
          list={`hotels-${index}`}
          value={booking.hotelName}
          onChange={(e) => handleHotelSelect(e.target.value)}
          placeholder="Select hotel..."
          className="h-9 text-sm font-medium bg-background/50 border-border/60 focus:border-primary/50"
        />
        <datalist id={`hotels-${index}`}>
          {savedHotels.map((hotel) => (
            <option key={hotel.name} value={hotel.name} />
          ))}
        </datalist>
      </div>

      {/* Dates */}
      <div className="space-y-2 mb-4">
        <div>
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1 block">
            Check-in
          </Label>
          <DatePicker
            value={booking.checkIn}
            onChange={(val) => updateField("checkIn", val)}
            placeholder="Select date"
            isLinked={isCheckInLinked}
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1 block">
            Check-out
          </Label>
          <DatePicker
            value={booking.checkOut}
            onChange={(val) => updateField("checkOut", val)}
            placeholder="Select date"
          />
        </div>
      </div>

      {/* Guests */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1 block">
            Adults
          </Label>
          <Input
            type="number"
            min={1}
            value={booking.numAdults}
            onChange={(e) => updateField("numAdults", parseInt(e.target.value) || 1)}
            className="h-8 text-sm text-center bg-background/50 border-border/60"
          />
        </div>
        <div className="flex-1">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1 block">
            Kids
          </Label>
          <Input
            type="number"
            min={0}
            value={booking.numKids}
            onChange={(e) => updateField("numKids", parseInt(e.target.value) || 0)}
            className="h-8 text-sm text-center bg-background/50 border-border/60"
          />
        </div>
      </div>

      {/* Meal & Room Toggles */}
      <div className="space-y-3">
        <div>
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Meal Plan
          </Label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={booking.mealType === "BB" ? "default" : "outline"}
              className={cn(
                "flex-1 h-7 text-xs font-medium transition-all",
                booking.mealType === "BB" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background/50 border-border/60 hover:bg-muted/50"
              )}
              onClick={() => updateField("mealType", "BB")}
            >
              BB
            </Button>
            <Button
              type="button"
              size="sm"
              variant={booking.mealType === "FB" ? "default" : "outline"}
              className={cn(
                "flex-1 h-7 text-xs font-medium transition-all",
                booking.mealType === "FB" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background/50 border-border/60 hover:bg-muted/50"
              )}
              onClick={() => updateField("mealType", "FB")}
            >
              FB
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Room Type
          </Label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={booking.roomCategory === "Standard" ? "default" : "outline"}
              className={cn(
                "flex-1 h-7 text-xs font-medium transition-all",
                booking.roomCategory === "Standard" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background/50 border-border/60 hover:bg-muted/50"
              )}
              onClick={() => updateField("roomCategory", "Standard")}
            >
              Standard
            </Button>
            <Button
              type="button"
              size="sm"
              variant={booking.roomCategory === "Upgrade" ? "default" : "outline"}
              className={cn(
                "flex-1 h-7 text-xs font-medium transition-all",
                booking.roomCategory === "Upgrade" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background/50 border-border/60 hover:bg-muted/50"
              )}
              onClick={() => updateField("roomCategory", "Upgrade")}
            >
              Upgrade
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CompactHotelBookingCard;
