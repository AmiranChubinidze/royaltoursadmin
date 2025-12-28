import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, CalendarIcon, Mail, Hotel } from "lucide-react";
import { cn } from "@/lib/utils";
import { HotelBooking } from "@/types/confirmation";

interface HotelBookingCardProps {
  booking: HotelBooking;
  onChange: (booking: HotelBooking) => void;
  onRemove: () => void;
  canRemove: boolean;
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

function generateEmailPreview(booking: HotelBooking): string {
  return `Please confirm the booking with the following details

Check in: ${booking.checkIn || "[Not set]"}
Check out: ${booking.checkOut || "[Not set]"}
Number of Adults: ${booking.numAdults}
Number of Kids: ${booking.numKids}
Meal Type (BB/FB): ${booking.mealType}
Room Category (Standard/Upgrade): ${booking.roomCategory}

Please confirm receipt of this reservation request.

Best regards,
LLC Royal Georgian Tours
Phone: +995 592 005 450
Email: Royalgeorgiantours@gmail.com`;
}

export function HotelBookingCard({
  booking,
  onChange,
  onRemove,
  canRemove,
}: HotelBookingCardProps) {
  const emailPreview = generateEmailPreview(booking);

  const updateField = <K extends keyof HotelBooking>(
    field: K,
    value: HotelBooking[K]
  ) => {
    onChange({ ...booking, [field]: value });
  };

  return (
    <Card className="border-2 border-border/50 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            {booking.hotelName}
          </CardTitle>
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {booking.hotelEmail}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Check-in</Label>
            <DatePicker
              value={booking.checkIn}
              onChange={(v) => updateField("checkIn", v)}
              placeholder="Check-in date"
            />
          </div>
          <div className="space-y-2">
            <Label>Check-out</Label>
            <DatePicker
              value={booking.checkOut}
              onChange={(v) => updateField("checkOut", v)}
              placeholder="Check-out date"
            />
          </div>
        </div>

        {/* Guest counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Adults</Label>
            <Input
              type="number"
              min={1}
              value={booking.numAdults}
              onChange={(e) =>
                updateField("numAdults", parseInt(e.target.value) || 1)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Kids</Label>
            <Input
              type="number"
              min={0}
              value={booking.numKids}
              onChange={(e) =>
                updateField("numKids", parseInt(e.target.value) || 0)
              }
            />
          </div>
        </div>

        {/* Meal Type */}
        <div className="space-y-2">
          <Label>Meal Type</Label>
          <RadioGroup
            value={booking.mealType}
            onValueChange={(v) => updateField("mealType", v as "BB" | "FB")}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="BB" id={`meal-bb-${booking.hotelId}`} />
              <Label
                htmlFor={`meal-bb-${booking.hotelId}`}
                className="cursor-pointer"
              >
                BB (Bed & Breakfast)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="FB" id={`meal-fb-${booking.hotelId}`} />
              <Label
                htmlFor={`meal-fb-${booking.hotelId}`}
                className="cursor-pointer"
              >
                FB (Full Board)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Room Category */}
        <div className="space-y-2">
          <Label>Room Category</Label>
          <RadioGroup
            value={booking.roomCategory}
            onValueChange={(v) =>
              updateField("roomCategory", v as "Standard" | "Upgrade")
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="Standard"
                id={`room-standard-${booking.hotelId}`}
              />
              <Label
                htmlFor={`room-standard-${booking.hotelId}`}
                className="cursor-pointer"
              >
                Standard
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="Upgrade"
                id={`room-upgrade-${booking.hotelId}`}
              />
              <Label
                htmlFor={`room-upgrade-${booking.hotelId}`}
                className="cursor-pointer"
              >
                Upgrade
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Email Preview */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Preview
          </Label>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
              {emailPreview}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility to generate email body for a booking
export function generateEmailBody(booking: HotelBooking): string {
  return `Please confirm the booking with the following details

Check in: ${booking.checkIn}
Check out: ${booking.checkOut}
Number of Adults: ${booking.numAdults}
Number of Kids: ${booking.numKids}
Meal Type (BB/FB): ${booking.mealType}
Room Category (Standard/Upgrade): ${booking.roomCategory}

Please confirm receipt of this reservation request.

Best regards,
LLC Royal Georgian Tours
Phone: +995 592 005 450
Email: Royalgeorgiantours@gmail.com`;
}
