import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, X, Link2, GripVertical, Hotel, ChevronDown, Check } from "lucide-react";
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
  hideGuestFields?: boolean;
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
            "w-full justify-start text-left font-medium h-10 text-xs px-2",
            "bg-background/80 border-border hover:bg-accent/50 hover:border-primary/30",
            "transition-all duration-200 overflow-hidden",
            !value && "text-muted-foreground font-normal",
            isLinked && "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
          )}
        >
          {!value && isLinked && <Link2 className="h-3 w-3 mr-1 shrink-0 text-primary" />}
          {!value && !isLinked && <CalendarIcon className="h-3 w-3 mr-1 shrink-0 text-muted-foreground" />}
          <span className="truncate">{value || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-popover border border-border shadow-lg z-50" 
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={16}
      >
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

const HotelSelector = ({
  value,
  onChange,
  hotels,
}: {
  value: string;
  onChange: (val: string) => void;
  hotels: { name: string; email: string }[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-10 text-sm font-medium",
            "bg-background/80 border-border hover:bg-accent/50 hover:border-primary/30",
            "transition-all duration-200",
            !value && "text-muted-foreground font-normal"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Hotel className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value || "Select hotel..."}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[220px] p-0 bg-popover border border-border shadow-lg z-50" 
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search hotels..." className="h-9" />
          <CommandList>
            <CommandEmpty>No hotel found.</CommandEmpty>
            <CommandGroup>
              {hotels.map((hotel) => (
                <CommandItem
                  key={hotel.name}
                  value={hotel.name}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === hotel.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{hotel.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
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
  hideGuestFields = false,
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
        "p-0 min-w-[240px] w-[240px] flex-shrink-0 relative overflow-hidden",
        "bg-card border-border/60 shadow-md",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
        isDragging && "opacity-90 shadow-2xl scale-[1.02] z-50 border-primary ring-2 ring-primary/20"
      )}
    >
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-white/20 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-primary-foreground/80" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">{index + 1}</span>
            </div>
            <span className="text-sm font-semibold text-primary-foreground tracking-wide">
              Stop
            </span>
          </div>
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/20"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Hotel Name */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Hotel
          </Label>
          <HotelSelector
            value={booking.hotelName}
            onChange={handleHotelSelect}
            hotels={savedHotels}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Check-in
            </Label>
            <DatePicker
              value={booking.checkIn}
              onChange={(val) => updateField("checkIn", val)}
              placeholder="Date"
              isLinked={isCheckInLinked}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Check-out
            </Label>
            <DatePicker
              value={booking.checkOut}
              onChange={(val) => updateField("checkOut", val)}
              placeholder="Date"
            />
          </div>
        </div>

        {/* Guests - only show if hotel requires booking and not using shared guest settings */}
        {booking.hotelEmail && !hideGuestFields && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Adults
              </Label>
              <Input
                type="number"
                min={1}
                value={booking.numAdults}
                onChange={(e) => updateField("numAdults", parseInt(e.target.value) || 1)}
                className="h-10 text-sm text-center font-medium bg-background/80 border-border hover:border-primary/30 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Kids
              </Label>
              <Input
                type="number"
                min={0}
                value={booking.numKids}
                onChange={(e) => updateField("numKids", parseInt(e.target.value) || 0)}
                className="h-10 text-sm text-center font-medium bg-background/80 border-border hover:border-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </div>
        )}

        {/* Meal & Room Toggles - only show if hotel requires booking */}
        {booking.hotelEmail && (
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Meal Plan
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={booking.mealType === "BB" ? "default" : "outline"}
                  className={cn(
                    "flex-1 h-9 text-sm font-semibold transition-all duration-200",
                    booking.mealType === "BB" 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-background/80 border-border hover:bg-accent/50 hover:border-primary/30"
                  )}
                  onClick={() => updateField("mealType", "BB")}
                >
                  B&B
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={booking.mealType === "FB" ? "default" : "outline"}
                  className={cn(
                    "flex-1 h-9 text-sm font-semibold transition-all duration-200",
                    booking.mealType === "FB" 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-background/80 border-border hover:bg-accent/50 hover:border-primary/30"
                  )}
                  onClick={() => updateField("mealType", "FB")}
                >
                  Full Board
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Room Type
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={booking.roomCategory === "Standard" ? "default" : "outline"}
                  className={cn(
                    "flex-1 h-9 text-sm font-semibold transition-all duration-200",
                    booking.roomCategory === "Standard" 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-background/80 border-border hover:bg-accent/50 hover:border-primary/30"
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
                    "flex-1 h-9 text-sm font-semibold transition-all duration-200",
                    booking.roomCategory === "Upgrade" 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-background/80 border-border hover:bg-accent/50 hover:border-primary/30"
                  )}
                  onClick={() => updateField("roomCategory", "Upgrade")}
                >
                  Upgrade
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Transit stop indicator */}
        {!booking.hotelEmail && booking.hotelName && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-xs italic">Transit stop - no booking required</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CompactHotelBookingCard;
