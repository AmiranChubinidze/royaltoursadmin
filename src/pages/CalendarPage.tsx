import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Bell, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useSavedHotels } from "@/hooks/useSavedData";
import {
  useCalendarNotificationHotels,
  useCalendarNotificationSettings,
  useSetCalendarNotificationHotels,
  useUpsertCalendarNotificationSettings,
} from "@/hooks/useCalendarNotifications";

type OwnedStay = {
  dateKey: string;
  hotel: string;
  code: string;
  client: string | null;
};

const parseDateFlexible = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const d = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function CalendarPage() {
  const { data: confirmations, isLoading } = useConfirmations(500);
  const { data: savedHotels } = useSavedHotels();
  const { data: notificationSettings } = useCalendarNotificationSettings();
  const { data: selectedHotelIds } = useCalendarNotificationHotels();
  const upsertSettings = useUpsertCalendarNotificationSettings();
  const setNotificationHotels = useSetCalendarNotificationHotels();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [timeLocal, setTimeLocal] = useState("09:00");
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [useAllHotelsState, setUseAllHotelsState] = useState(true);
  const [remindOffsetDays, setRemindOffsetDays] = useState(1);
  const [tzOffsetState] = useState(-240);
  const [selectedHotelIdsState, setSelectedHotelIdsState] = useState<string[]>([]);
  const [hasSyncedHotels, setHasSyncedHotels] = useState(false);

  useEffect(() => {
    if (notificationSettings?.time_local) {
      setTimeLocal(notificationSettings.time_local);
    }
    if (notificationSettings?.enabled !== undefined) {
      setRemindersEnabled(notificationSettings.enabled);
    }
    if (notificationSettings?.use_all_hotels !== undefined) {
      setUseAllHotelsState(notificationSettings.use_all_hotels);
    }
    if (notificationSettings?.remind_offset_days !== undefined) {
      setRemindOffsetDays(notificationSettings.remind_offset_days);
    }
  }, [
    notificationSettings?.time_local,
    notificationSettings?.enabled,
    notificationSettings?.use_all_hotels,
    notificationSettings?.remind_offset_days,
  ]);

  useEffect(() => {
    if (!hasSyncedHotels && selectedHotelIds) {
      setSelectedHotelIdsState(selectedHotelIds);
      setHasSyncedHotels(true);
    }
  }, [selectedHotelIds, hasSyncedHotels]);

  const ownedHotelSet = useMemo(() => {
    return new Set(
      (savedHotels || [])
        .filter((h) => h.is_owned)
        .map((h) => h.name.trim().toLowerCase())
    );
  }, [savedHotels]);

  const ownedHotels = useMemo(() => {
    return (savedHotels || []).filter((h) => h.is_owned);
  }, [savedHotels]);

  const ownedStaysByDate = useMemo(() => {
    const map = new Map<string, OwnedStay[]>();
    if (!confirmations || ownedHotelSet.size === 0) return map;

    for (const c of confirmations) {
      const code = c.confirmation_code;
      const client = c.main_client_name || null;
      const itinerary = (c.raw_payload as any)?.itinerary || [];
      for (const day of itinerary) {
        const hotelName = String(day?.hotel || "").trim();
        if (!hotelName) continue;
        if (!ownedHotelSet.has(hotelName.toLowerCase())) continue;
        const date = parseDateFlexible(day?.date);
        if (!date) continue;
        const key = format(date, "yyyy-MM-dd");
        const list = map.get(key) || [];
        list.push({ dateKey: key, hotel: hotelName, code, client });
        map.set(key, list);
      }
    }

    return map;
  }, [confirmations, ownedHotelSet]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(monthStart),
    [monthStart]
  );
  const dayNumberFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { day: "numeric" }),
    []
  );

  const days: Date[] = [];
  for (let day = calendarStart; day <= calendarEnd; day = addDays(day, 1)) {
    days.push(day);
  }

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedStays = selectedKey ? ownedStaysByDate.get(selectedKey) || [] : [];
  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(selectedDate)
    : "Select a Date";
  const notificationsEnabled = notificationSettings?.enabled ?? remindersEnabled;
  const selectedSet = useMemo(() => new Set(selectedHotelIdsState || []), [selectedHotelIdsState]);
  const tzOffset = tzOffsetState;

  const updateSettings = (
    next: Partial<{ enabled: boolean; time_local: string; use_all_hotels: boolean; remind_offset_days: number }>
  ) => {
    upsertSettings.mutate({
      enabled: next.enabled ?? remindersEnabled,
      time_local: next.time_local ?? timeLocal,
      tz_offset_min: tzOffset,
      use_all_hotels: next.use_all_hotels ?? useAllHotelsState,
      remind_offset_days: next.remind_offset_days ?? remindOffsetDays,
    });
  };

  const toggleHotelSelection = (hotelId: string) => {
    const next = new Set(selectedSet);
    if (next.has(hotelId)) {
      next.delete(hotelId);
    } else {
      next.add(hotelId);
    }
    const nextList = Array.from(next);
    setSelectedHotelIdsState(nextList);
    setNotificationHotels.mutate(nextList);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div
        className={cn(
          "grid gap-6",
          remindersOpen ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]" : "lg:grid-cols-1"
        )}
      >
        <Card className="border-border/60 bg-gradient-to-br from-[#F5FBFC] via-white to-[#F1FAFB] shadow-[0_2px_12px_0_rgba(15,76,92,0.06)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-balance">Owned Hotels Calendar</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    See tourist stays in company-owned hotels
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
                    remindersOpen && "border-[#0F4C5C]/40 bg-[#EAF3F4] text-[#0F4C5C]"
                  )}
                  aria-label={remindersOpen ? "Hide reminders panel" : "Show reminders panel"}
                  onClick={() => setRemindersOpen((prev) => !prev)}
                >
                  <Bell className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Previous month"
                  onClick={() => setCurrentMonth(addDays(monthStart, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-3 py-1.5 rounded-lg bg-[#EAF3F4] text-[#0F4C5C] text-sm font-semibold">
                  {monthLabel}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Next month"
                  onClick={() => setCurrentMonth(addDays(monthEnd, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-2 py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => {
                const inMonth = isSameMonth(day, monthStart);
                const dayKey = format(day, "yyyy-MM-dd");
                const stays = ownedStaysByDate.get(dayKey) || [];
                const hasStays = stays.length > 0;
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                return (
                  <button
                    key={dayKey}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "min-h-[92px] rounded-xl border px-2.5 py-2 text-left transition-colors hover:bg-[#F7FAFB] hover:border-[#0F4C5C]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]/40 focus-visible:ring-offset-2",
                      inMonth ? "bg-white/80" : "bg-muted/30",
                      hasStays ? "border-[#0F4C5C]/30 shadow-[0_1px_8px_rgba(15,76,92,0.08)]" : "border-border/50",
                      isSelected && "ring-2 ring-[#0F4C5C]/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-semibold", inMonth ? "text-foreground" : "text-muted-foreground")}>
                      {dayNumberFormatter.format(day)}
                    </span>
                      {hasStays && (
                        <Badge className="bg-[#0F4C5C]/10 text-[#0F4C5C] border-0 text-[10px] px-1.5">
                          {stays.length}
                        </Badge>
                      )}
                    </div>
                    {hasStays && (
                      <div className="mt-2 space-y-1">
                        {stays.slice(0, 2).map((s, idx) => (
                          <div key={`${dayKey}-${idx}`} className="text-[11px] text-[#0F4C5C] truncate">
                            {s.hotel}
                          </div>
                        ))}
                        {stays.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">+{stays.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {remindersOpen && (
          <Card className="border-border/60 bg-white/80 shadow-[0_2px_10px_rgba(15,76,92,0.05)]">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-balance">Arrival Reminders</CardTitle>
                  <p className="text-xs text-muted-foreground">Email you the day before guests arrive.</p>
                </div>
              </div>
                <Switch
                  checked={remindersEnabled}
                  onCheckedChange={(checked) => {
                    setRemindersEnabled(checked);
                    updateSettings({ enabled: checked });
                  }}
                  aria-label="Enable arrival reminders"
                />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Before</Label>
                <Select
                  value={String(remindOffsetDays)}
                  onValueChange={(value) => {
                    const nextValue = Number(value);
                    setRemindOffsetDays(nextValue);
                    updateSettings({ remind_offset_days: nextValue });
                  }}
                >
                <SelectTrigger className="h-9 rounded-lg border-border/70 bg-[#F7FAFB] text-xs font-medium text-[#0F4C5C]">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Same day</SelectItem>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="2">2 days before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Select
                  value={timeLocal}
                  onValueChange={(value) => {
                    setTimeLocal(value);
                    updateSettings({ time_local: value });
                  }}
                >
                  <SelectTrigger className="h-9 rounded-lg border-border/70 bg-[#F7FAFB] text-xs font-medium text-[#0F4C5C]">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const value = `${String(hour).padStart(2, "0")}:00`;
                      return (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator className="bg-border/70" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-muted-foreground">Owned Hotels</Label>
                <p className="text-[11px] text-muted-foreground">Pick which hotels trigger reminders.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">All Owned</span>
                  <Switch
                    checked={useAllHotelsState}
                    onCheckedChange={(checked) => {
                      setUseAllHotelsState(checked);
                      updateSettings({ use_all_hotels: checked });
                    }}
                    aria-label="Use all owned hotels"
                  />
              </div>
            </div>
            {useAllHotelsState ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-[#F7FAFB] px-3 py-2 text-xs text-muted-foreground">
                All owned hotels are included.
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-[#F7FAFB] p-1">
                <ScrollArea className="h-[220px]">
                  <div className="p-2 space-y-2">
                    {ownedHotels.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No owned hotels saved yet.</div>
                    ) : (
                      ownedHotels.map((hotel) => {
                        const checked = selectedSet.has(hotel.id);
                        return (
                          <div
                            key={hotel.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleHotelSelection(hotel.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleHotelSelection(hotel.id);
                              }
                            }}
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]/30",
                              checked
                                ? "border-[#0F4C5C]/40 bg-[#F1FAFB] shadow-[0_1px_6px_rgba(15,76,92,0.08)]"
                                : "border-border/60 bg-white/90 hover:bg-[#F7FAFB]"
                            )}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{hotel.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">Owned hotel</div>
                            </div>
                            <div
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleHotelSelection(hotel.id)}
                                className="h-5 w-5 rounded-md border-border/70 data-[state=checked]:bg-[#0F4C5C] data-[state=checked]:text-white cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-border/60 bg-card/80 shadow-[0_1px_8px_rgba(15,76,92,0.06)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-balance">{selectedDateLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : selectedStays.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No owned-hotel stays on this day.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedStays.map((s, idx) => (
                <div
                  key={`${s.dateKey}-${idx}`}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-[#F6FBFC] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{s.hotel}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.code} {s.client ? ` - ${s.client}` : ""}
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-0">Owned</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
