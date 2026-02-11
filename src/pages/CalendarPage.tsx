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
import { Bell, CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useSalaryProfiles } from "@/hooks/useSalaries";
import { useUserRole } from "@/hooks/useUserRole";
import { useViewAs } from "@/contexts/ViewAsContext";
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
  isOwned: boolean;
};

type SalaryMarker = {
  dateKey: string;
  name: string;
  amount: number;
  currency: "GEL" | "USD";
  frequency: "monthly" | "weekly";
};

type CalendarContentMode = "stays" | "payments" | "both";

const CALENDAR_VIEW_PREFS_KEY = "calendar-view-preferences-v1";

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
  const isMobile = useIsMobile();
  const { data: notificationSettings } = useCalendarNotificationSettings();
  const { data: selectedHotelIds } = useCalendarNotificationHotels();
  const upsertSettings = useUpsertCalendarNotificationSettings();
  const setNotificationHotels = useSetCalendarNotificationHotels();
  const { toast } = useToast();
  const { role, isLoading: isRoleLoading } = useUserRole();
  const { viewAsRole } = useViewAs();
  const effectiveRole = viewAsRole || role;
  const canSeeSalaries = ["admin", "worker", "accountant"].includes(effectiveRole || "");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [timeLocal, setTimeLocal] = useState("09:00");
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [hotelView, setHotelView] = useState<"owned" | "other" | "all">("all");
  const [checkInsOnly, setCheckInsOnly] = useState(false);
  const [calendarContentMode, setCalendarContentMode] = useState<CalendarContentMode>("stays");
  const [hasLoadedViewPrefs, setHasLoadedViewPrefs] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [useAllHotelsState, setUseAllHotelsState] = useState(true);
  const [useAllOtherHotelsState, setUseAllOtherHotelsState] = useState(true);
  const [remindOffsetDays, setRemindOffsetDays] = useState(1);
  const [tzOffsetState] = useState(-240);
  const [selectedHotelIdsState, setSelectedHotelIdsState] = useState<string[]>([]);
  const [hasSyncedHotels, setHasSyncedHotels] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [pendingSettings, setPendingSettings] = useState({
    enabled: remindersEnabled,
    time_local: timeLocal,
    use_all_hotels: useAllHotelsState,
    use_all_other_hotels: useAllOtherHotelsState,
    remind_offset_days: remindOffsetDays,
  });

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
    if (notificationSettings?.use_all_other_hotels !== undefined) {
      setUseAllOtherHotelsState(notificationSettings.use_all_other_hotels);
    }
    if (notificationSettings?.remind_offset_days !== undefined) {
      setRemindOffsetDays(notificationSettings.remind_offset_days);
    }
  }, [
    notificationSettings?.time_local,
    notificationSettings?.enabled,
    notificationSettings?.use_all_hotels,
    notificationSettings?.use_all_other_hotels,
    notificationSettings?.remind_offset_days,
  ]);

  useEffect(() => {
    setPendingSettings({
      enabled: remindersEnabled,
      time_local: timeLocal,
      use_all_hotels: useAllHotelsState,
      use_all_other_hotels: useAllOtherHotelsState,
      remind_offset_days: remindOffsetDays,
    });
  }, [remindersEnabled, timeLocal, useAllHotelsState, useAllOtherHotelsState, remindOffsetDays]);

  useEffect(() => {
    if (!hasSyncedHotels && selectedHotelIds) {
      setSelectedHotelIdsState(selectedHotelIds);
      setHasSyncedHotels(true);
    }
  }, [selectedHotelIds, hasSyncedHotels]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(CALENDAR_VIEW_PREFS_KEY);
    if (!raw) {
      setHasLoadedViewPrefs(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<{
        hotelView: "owned" | "other" | "all";
        checkInsOnly: boolean;
        calendarContentMode: CalendarContentMode;
      }>;
      if (parsed.hotelView && ["owned", "other", "all"].includes(parsed.hotelView)) {
        setHotelView(parsed.hotelView);
      }
      if (typeof parsed.checkInsOnly === "boolean") {
        setCheckInsOnly(parsed.checkInsOnly);
      }
      if (parsed.calendarContentMode && ["stays", "payments", "both"].includes(parsed.calendarContentMode)) {
        setCalendarContentMode(parsed.calendarContentMode);
      }
    } catch {
      // Ignore malformed local preference payload.
    } finally {
      setHasLoadedViewPrefs(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedViewPrefs) return;
    const prefs = {
      hotelView,
      checkInsOnly,
      calendarContentMode,
    };
    window.localStorage.setItem(CALENDAR_VIEW_PREFS_KEY, JSON.stringify(prefs));
  }, [hotelView, checkInsOnly, calendarContentMode, hasLoadedViewPrefs]);

  useEffect(() => {
    if (isRoleLoading && !viewAsRole) return;
    if (!canSeeSalaries && calendarContentMode !== "stays") {
      setCalendarContentMode("stays");
    }
  }, [canSeeSalaries, calendarContentMode, isRoleLoading, viewAsRole]);

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
  const otherHotels = useMemo(() => {
    return (savedHotels || []).filter((h) => !h.is_owned);
  }, [savedHotels]);

  const staysByDate = useMemo(() => {
    const map = new Map<string, OwnedStay[]>();
    if (!confirmations) return map;

    for (const c of confirmations) {
      const code = c.confirmation_code;
      const client = c.main_client_name || null;
      const payload = c.raw_payload as unknown;
      const itineraryValue =
        payload && typeof payload === "object" ? (payload as Record<string, unknown>)["itinerary"] : undefined;
      const itinerary = Array.isArray(itineraryValue) ? itineraryValue : [];
      for (const day of itinerary) {
        const hotelName = String(day?.hotel || "").trim();
        if (!hotelName) continue;
        const date = parseDateFlexible(day?.date);
        if (!date) continue;
        const isOwned = ownedHotelSet.has(hotelName.toLowerCase());
        const key = format(date, "yyyy-MM-dd");
        const list = map.get(key) || [];
        list.push({ dateKey: key, hotel: hotelName, code, client, isOwned });
        map.set(key, list);
      }
    }

    return map;
  }, [confirmations, ownedHotelSet]);

  const checkInsByDate = useMemo(() => {
    const map = new Map<string, OwnedStay[]>();
    if (!confirmations) return map;

    for (const c of confirmations) {
      const code = c.confirmation_code;
      const client = c.main_client_name || null;
      const payload = c.raw_payload as unknown;
      const itineraryValue =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)["itinerary"]
          : undefined;
      const itineraryRaw = Array.isArray(itineraryValue) ? itineraryValue : [];

      const itinerary = itineraryRaw
        .map((day) => {
          const hotelName = String((day as any)?.hotel || "").trim();
          const date = parseDateFlexible((day as any)?.date);
          return { hotelName, date };
        })
        .filter((d) => !!d.hotelName && !!d.date)
        .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());

      let prevHotel = "";
      for (const day of itinerary) {
        const hotelName = day.hotelName;
        if (!hotelName) continue;

        // Check-in day is when the hotel changes (or first hotel).
        if (prevHotel && prevHotel.toLowerCase() === hotelName.toLowerCase()) {
          continue;
        }
        prevHotel = hotelName;

        const date = day.date as Date;
        const isOwned = ownedHotelSet.has(hotelName.toLowerCase());
        const key = format(date, "yyyy-MM-dd");
        const list = map.get(key) || [];
        list.push({ dateKey: key, hotel: hotelName, code, client, isOwned });
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

  const showHotelStays = calendarContentMode !== "payments";
  const showSalaryPayments = canSeeSalaries && calendarContentMode !== "stays";
  const baseStaysByDate = showHotelStays ? (checkInsOnly ? checkInsByDate : staysByDate) : new Map<string, OwnedStay[]>();
  const visibleStaysByDate = useMemo(() => {
    const map = new Map<string, OwnedStay[]>();
    for (const [key, list] of baseStaysByDate.entries()) {
      const filtered =
        hotelView === "all"
          ? list
          : hotelView === "owned"
          ? list.filter((s) => s.isOwned)
          : list.filter((s) => !s.isOwned);
      map.set(key, filtered);
    }
    return map;
  }, [baseStaysByDate, hotelView]);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedStays = selectedKey ? visibleStaysByDate.get(selectedKey) || [] : [];
  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(selectedDate)
    : "Select a Date";
  const notificationsEnabled = notificationSettings?.enabled ?? remindersEnabled;
  const selectedSet = useMemo(() => new Set(selectedHotelIdsState || []), [selectedHotelIdsState]);
  const tzOffset = tzOffsetState;

  const { data: salaryProfiles } = useSalaryProfiles({
    enabled: showSalaryPayments,
  });

  const salaryByDate = useMemo(() => {
    const map = new Map<string, SalaryMarker[]>();
    if (!showSalaryPayments || !salaryProfiles?.length) return map;

    const monthStartLocal = startOfMonth(currentMonth);
    const lastDay = endOfMonth(monthStartLocal).getDate();

    // Monthly occurrences (one per month).
    for (const p of salaryProfiles) {
      if (p.frequency === "monthly") {
        const day = Math.min(Math.max(1, p.dueDay), lastDay);
        const due = new Date(monthStartLocal.getFullYear(), monthStartLocal.getMonth(), day);
        const key = format(due, "yyyy-MM-dd");
        const list = map.get(key) || [];
        list.push({
          dateKey: key,
          name: p.name,
          amount: p.amount,
          currency: p.currency,
          frequency: "monthly",
        });
        map.set(key, list);
      }
    }

    // Weekly occurrences (every week on pay weekday).
    for (const p of salaryProfiles) {
      if (p.frequency !== "weekly") continue;
      for (const d of days) {
        if (!isSameMonth(d, monthStartLocal)) continue;
        const weekday = ((d.getDay() + 6) % 7) + 1; // 1=Mon..7=Sun
        if (weekday !== p.dueWeekday) continue;
        const key = format(d, "yyyy-MM-dd");
        const list = map.get(key) || [];
        list.push({
          dateKey: key,
          name: p.name,
          amount: p.amount,
          currency: p.currency,
          frequency: "weekly",
        });
        map.set(key, list);
      }
    }

    return map;
  }, [showSalaryPayments, salaryProfiles, currentMonth, days]);

  const selectedSalaries = selectedKey ? salaryByDate.get(selectedKey) || [] : [];

  const updateSettings = (
    next: Partial<{
      enabled: boolean;
      time_local: string;
      use_all_hotels: boolean;
      use_all_other_hotels: boolean;
      remind_offset_days: number;
    }>
  ) => {
    setPendingSettings((prev) => ({
      ...prev,
      ...next,
    }));
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await upsertSettings.mutateAsync({
        enabled: pendingSettings.enabled,
        time_local: pendingSettings.time_local,
        tz_offset_min: tzOffset,
        use_all_hotels: pendingSettings.use_all_hotels,
        use_all_other_hotels: pendingSettings.use_all_other_hotels,
        remind_offset_days: pendingSettings.remind_offset_days,
      });
      toast({ title: "Saved", description: "Reminder settings updated." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setIsSavingSettings(false);
    }
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
    <div className="animate-fade-in max-w-7xl mx-auto space-y-5">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-foreground">Calendar</h1>
          <p className="text-muted-foreground">Hotel stays and arrival reminders.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[#0F4C5C]/10 bg-white px-2 py-1.5 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-[#EAF7F8]"
              aria-label="Previous month"
              onClick={() => setCurrentMonth(addDays(monthStart, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 py-1 rounded-full border border-[#0F4C5C]/10 bg-white text-xs text-muted-foreground">
              {monthLabel}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-[#EAF7F8]"
              aria-label="Next month"
              onClick={() => setCurrentMonth(addDays(monthEnd, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Popover open={viewOpen} onOpenChange={setViewOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-9 rounded-xl border-[#0F4C5C]/15 hover:bg-[#EAF7F8]",
                  viewOpen && "bg-[#EAF7F8] text-[#0F4C5C]",
                )}
                aria-label="Calendar view options"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                View
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[320px] p-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">Hotels</div>
                  <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-[#F7FAFB] p-1">
                    {[
                      { key: "owned" as const, label: "Owned" },
                      { key: "all" as const, label: "All" },
                      { key: "other" as const, label: "Other" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setHotelView(opt.key)}
                        className={cn(
                          "h-9 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]/30",
                          hotelView === opt.key
                            ? "bg-white text-[#0F4C5C] shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Filters hotel stays shown on the calendar.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">Days</div>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-[#F7FAFB] p-1">
                    {[
                      { key: "all" as const, label: "All stay days" },
                      { key: "checkins" as const, label: "Check-ins only" },
                    ].map((opt) => {
                      const active = opt.key === "checkins" ? checkInsOnly : !checkInsOnly;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setCheckInsOnly(opt.key === "checkins")}
                          className={cn(
                            "h-9 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]/30",
                            active ? "bg-white text-[#0F4C5C] shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">Show</div>
                  <div
                    className={cn(
                      "grid gap-1 rounded-xl border border-border/70 bg-[#F7FAFB] p-1",
                      canSeeSalaries ? "grid-cols-3" : "grid-cols-1"
                    )}
                  >
                    {[
                      { key: "stays" as const, label: "Stays", disabled: false },
                      { key: "payments" as const, label: "Payments", disabled: !canSeeSalaries },
                      { key: "both" as const, label: "Both", disabled: !canSeeSalaries },
                    ]
                      .filter((opt) => !opt.disabled || canSeeSalaries)
                      .map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setCalendarContentMode(opt.key)}
                          className={cn(
                            "h-9 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]/30",
                            calendarContentMode === opt.key
                              ? "bg-white text-[#0F4C5C] shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Choose whether to see stays, salary payments, or both.</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={remindersOpen} onOpenChange={setRemindersOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-9 rounded-xl border-[#0F4C5C]/15 hover:bg-[#EAF7F8]",
                  remindersOpen && "bg-[#EAF7F8] text-[#0F4C5C]",
                )}
                aria-label="Arrival reminder options"
              >
                <Bell className="h-4 w-4 mr-2" />
                Reminders
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[360px] p-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#0F4C5C]">Arrival Reminders</div>
                    <p className="text-[11px] text-muted-foreground">
                      Email you before guests arrive.
                    </p>
                  </div>
                  <Switch
                    checked={pendingSettings.enabled}
                    onCheckedChange={(checked) => {
                      setRemindersEnabled(checked);
                      updateSettings({ enabled: checked });
                    }}
                    aria-label="Enable arrival reminders"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Before</Label>
                    <Select
                      value={String(pendingSettings.remind_offset_days)}
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
                      value={pendingSettings.time_local}
                      onValueChange={(value) => {
                        setTimeLocal(value);
                        updateSettings({ time_local: value });
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-border/70 bg-[#F7FAFB] text-xs font-medium text-[#0F4C5C]">
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 * 4 }).map((_, idx) => {
                          const hour = Math.floor(idx / 4);
                          const minute = (idx % 4) * 15;
                          const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="text-xs text-muted-foreground">Owned Hotels</Label>
                    <p className="text-[11px] text-muted-foreground truncate">Which owned hotels trigger reminders.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">All</span>
                    <Switch
                      checked={pendingSettings.use_all_hotels}
                      onCheckedChange={(checked) => {
                        setUseAllHotelsState(checked);
                        updateSettings({ use_all_hotels: checked });
                      }}
                      aria-label="Use all owned hotels"
                    />
                  </div>
                </div>
                {!pendingSettings.use_all_hotels && (
                  <div className="rounded-xl border border-border/60 bg-[#F7FAFB] p-1">
                    <ScrollArea className="h-[180px]">
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
                                  "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]/30",
                                  checked
                                    ? "border-[#0F4C5C]/40 bg-[#F1FAFB] shadow-[0_1px_6px_rgba(15,76,92,0.08)]"
                                    : "border-border/60 bg-white/90 hover:bg-[#F7FAFB]"
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{hotel.name}</div>
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

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="text-xs text-muted-foreground">Other Hotels</Label>
                    <p className="text-[11px] text-muted-foreground truncate">Which other hotels trigger reminders.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">All</span>
                    <Switch
                      checked={pendingSettings.use_all_other_hotels}
                      onCheckedChange={(checked) => {
                        setUseAllOtherHotelsState(checked);
                        updateSettings({ use_all_other_hotels: checked });
                      }}
                      aria-label="Use all other hotels"
                    />
                  </div>
                </div>
                {!pendingSettings.use_all_other_hotels && (
                  <div className="rounded-xl border border-border/60 bg-[#F7FAFB] p-1">
                    <ScrollArea className="h-[180px]">
                      <div className="p-2 space-y-2">
                        {otherHotels.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No other hotels saved yet.</div>
                        ) : (
                          otherHotels.map((hotel) => {
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
                                  "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B4F55]/25",
                                  checked
                                    ? "border-[#4B4F55]/40 bg-[#F2F3F5] shadow-[0_1px_6px_rgba(75,79,85,0.08)]"
                                    : "border-border/60 bg-white/90 hover:bg-[#F7FAFB]"
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{hotel.name}</div>
                                </div>
                                <div
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => event.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleHotelSelection(hotel.id)}
                                    className="h-5 w-5 rounded-md border-border/70 data-[state=checked]:bg-[#4B4F55] data-[state=checked]:text-white cursor-pointer"
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

                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    className="h-9 px-4 rounded-xl bg-[#0F4C5C] text-white hover:bg-[#0F4C5C]/90 shadow-[0_10px_24px_rgba(15,76,92,0.16)]"
                    onClick={saveSettings}
                    disabled={isSavingSettings}
                  >
                    {isSavingSettings ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl border border-[#0F4C5C]/10 bg-white shadow-[0_10px_24px_rgba(15,76,92,0.08)] overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-[#EAF7F8] border border-[#0F4C5C]/10 flex items-center justify-center shadow-[0_10px_24px_rgba(15,76,92,0.08)]">
                  <CalendarDays className="h-4 w-4 text-[#0F4C5C]" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-[#0F4C5C]">Hotel Stays Calendar</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {hotelView === "owned" ? "Owned hotels" : hotelView === "other" ? "Other hotels" : "All hotels"}
                    {showHotelStays ? (checkInsOnly ? " - check-ins only" : " - all stay days") : " - stays hidden"}
                    {showSalaryPayments ? " - salary payments" : ""}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-2 py-1">
                  {isMobile ? d.slice(0, 1) : d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => {
                const inMonth = isSameMonth(day, monthStart);
                const dayKey = format(day, "yyyy-MM-dd");
                const stays = visibleStaysByDate.get(dayKey) || [];
                const salaryList = salaryByDate.get(dayKey) || [];
                const hasStays = stays.length > 0;
                const hasSalaries = showSalaryPayments && salaryList.length > 0;
                const ownedCount = stays.filter((s) => s.isOwned).length;
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                return (
                  <button
                    key={dayKey}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "min-h-[58px] sm:min-h-[84px] rounded-xl border px-2 py-2 text-left transition-colors hover:bg-[#EAF7F8]/40 hover:border-[#0F4C5C]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C5C]/40 focus-visible:ring-offset-2",
                      inMonth ? "bg-white/90 border-[#0F4C5C]/10" : "bg-white/60 border-border/60",
                      hasStays
                        ? ownedCount > 0
                          ? "border-[#0F4C5C]/25 shadow-[0_10px_24px_rgba(15,76,92,0.10)] bg-[#EAF7F8]/70"
                          : "border-slate-200 shadow-[0_10px_24px_rgba(15,76,92,0.06)] bg-slate-50"
                        : "",
                      isSelected && "ring-2 ring-[#0F4C5C]/40"
                    )}
                  >
                    {isMobile ? (
                      <div className="flex h-10 flex-col items-center justify-between">
                        <div className="flex h-4 w-full items-center justify-center">
                          {(hasStays || hasSalaries) && (
                            <div className="flex items-center gap-1">
                              {hasStays && (
                                <Badge
                                  className={cn(
                                    "h-4 min-w-[16px] px-1 rounded-full text-[9px] leading-none border-0",
                                    ownedCount > 0
                                      ? "bg-[#0F4C5C]/10 text-[#0F4C5C]"
                                      : "bg-slate-100 text-slate-700"
                                  )}
                                >
                                  {stays.length}
                                </Badge>
                              )}
                              {hasSalaries && (
                                <Badge className="h-4 min-w-[16px] px-1 rounded-full text-[9px] leading-none border-0 bg-amber-100 text-amber-800">
                                  Pay
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={cn("text-sm font-semibold", inMonth ? "text-foreground" : "text-muted-foreground")}>
                          {dayNumberFormatter.format(day)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className={cn("text-sm font-semibold", inMonth ? "text-foreground" : "text-muted-foreground")}>
                          {dayNumberFormatter.format(day)}
                        </span>
                        {(hasStays || hasSalaries) && (
                          <div className="flex items-center gap-1">
                            {hasStays && (
                              <Badge
                                className={cn(
                                  ownedCount > 0
                                    ? "bg-[#0F4C5C]/10 text-[#0F4C5C] border-0 text-[10px] px-1.5"
                                    : "bg-slate-100 text-slate-700 border-0 text-[10px] px-1.5"
                                )}
                              >
                                {stays.length}
                              </Badge>
                            )}
                            {hasSalaries && (
                              <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] px-1.5">
                                Pay
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {hasStays && !isMobile && (
                      <div className="mt-2 space-y-1">
                        {stays.slice(0, 2).map((s, idx) => (
                          <div
                            key={`${dayKey}-${idx}`}
                            className={cn(
                              "text-[11px] truncate",
                              s.isOwned ? "text-[#0F4C5C] font-medium" : "text-slate-700"
                            )}
                          >
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

        <Card className="rounded-2xl border border-[#0F4C5C]/10 bg-white shadow-[0_10px_24px_rgba(15,76,92,0.08)] overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8]/50">
          <CardTitle className="text-sm font-semibold text-[#0F4C5C]">{selectedDateLabel}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : selectedStays.length === 0 && (!showSalaryPayments || selectedSalaries.length === 0) ? (
            <div className="text-sm text-muted-foreground">Nothing scheduled on this day.</div>
          ) : (
            <div className="space-y-4">
              {selectedStays.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">Hotel Stays</div>
                  {selectedStays.map((s, idx) => (
                    <div
                      key={`${s.dateKey}-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-[#0F4C5C]/10 bg-white/90 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{s.hotel}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s.code} {s.client ? ` - ${s.client}` : ""}
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "border-0",
                          s.isOwned
                            ? "bg-[#0F4C5C]/10 text-[#0F4C5C]"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {s.isOwned ? "Owned" : "Other"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {showSalaryPayments && selectedSalaries.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">Salaries</div>
                  {selectedSalaries.map((s, idx) => (
                    <div
                      key={`${s.dateKey}-salary-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s.frequency === "weekly" ? "Weekly" : "Monthly"} salary
                        </div>
                      </div>
                      <Badge className="border-0 bg-amber-100 text-amber-800">
                        {s.currency === "USD" ? "$" : "₾"}
                        {Math.round(s.amount).toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
