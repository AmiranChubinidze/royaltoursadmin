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
import { CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal, Home } from "lucide-react";
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
import { getOwnedRoomStays } from "@/lib/confirmationUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSalaryProfiles } from "@/hooks/useSalaries";
import { useUserRole } from "@/hooks/useUserRole";
import { canManageFinances } from "@/lib/roles";
import { useViewAs } from "@/contexts/ViewAsContext";

type OwnedStay = {
  confirmationId: string;
  dateKey: string;
  hotel: string;
  code: string;
  client: string | null;
  isOwned: boolean;
  stayKey: string | null;
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

const getStayKey = (hotelName: string, stayIndex: number) =>
  `${hotelName.trim().toLowerCase()}::${stayIndex}`;

const currencySymbol = (currency?: string) => (currency === "GEL" ? "₾" : "$");

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
  const { role, isLoading: isRoleLoading } = useUserRole();
  const { viewAsRole } = useViewAs();
  const effectiveRole = viewAsRole || role;
  const canSeeSalaries = canManageFinances(effectiveRole);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewOpen, setViewOpen] = useState(false);
  const [hotelView, setHotelView] = useState<"owned" | "other" | "all">("all");
  const [checkInsOnly, setCheckInsOnly] = useState(false);
  const [calendarContentMode, setCalendarContentMode] = useState<CalendarContentMode>("stays");
  const effectiveCalendarContentMode: CalendarContentMode = canSeeSalaries ? calendarContentMode : "stays";
  const [hasLoadedViewPrefs, setHasLoadedViewPrefs] = useState(false);

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
      calendarContentMode: effectiveCalendarContentMode,
    };
    window.localStorage.setItem(CALENDAR_VIEW_PREFS_KEY, JSON.stringify(prefs));
  }, [hotelView, checkInsOnly, effectiveCalendarContentMode, hasLoadedViewPrefs]);

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


  const staysByDate = useMemo(() => {
    const map = new Map<string, OwnedStay[]>();
    if (!confirmations) return map;

    for (const c of confirmations) {
      const confirmationId = c.id;
      const code = c.confirmation_code;
      const client = c.main_client_name || null;
      const itinerary = (c.raw_payload?.itinerary || [])
        .map((day) => {
          const hotelName = String(day?.hotel || "").trim();
          const date = parseDateFlexible(day?.date);
          return { hotelName, date };
        })
        .filter((d) => !!d.hotelName && !!d.date)
        .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());

      let prevHotel = "";
      let currentStayKey: string | null = null;
      const nonOwnedStayCounts = new Map<string, number>();

      for (const day of itinerary) {
        const hotelName = day.hotelName;
        if (!hotelName) continue;
        const date = day.date as Date;
        const isOwned = ownedHotelSet.has(hotelName.toLowerCase());

        if (!prevHotel || prevHotel.toLowerCase() !== hotelName.toLowerCase()) {
          if (isOwned) {
            currentStayKey = null;
          } else {
            const hotelLower = hotelName.toLowerCase();
            const stayIndex = nonOwnedStayCounts.get(hotelLower) || 0;
            currentStayKey = getStayKey(hotelName, stayIndex);
            nonOwnedStayCounts.set(hotelLower, stayIndex + 1);
          }
          prevHotel = hotelName;
        }

        const key = format(date, "yyyy-MM-dd");
        const list = map.get(key) || [];
        list.push({
          confirmationId,
          dateKey: key,
          hotel: hotelName,
          code,
          client,
          isOwned,
          stayKey: currentStayKey,
        });
        map.set(key, list);
      }
    }

    return map;
  }, [confirmations, ownedHotelSet]);

  const checkInsByDate = useMemo(() => {
    const map = new Map<string, OwnedStay[]>();
    if (!confirmations) return map;

    for (const c of confirmations) {
      const confirmationId = c.id;
      const code = c.confirmation_code;
      const client = c.main_client_name || null;
      const itinerary = (c.raw_payload?.itinerary || [])
        .map((day) => {
          const hotelName = String(day?.hotel || "").trim();
          const date = parseDateFlexible(day?.date);
          return { hotelName, date };
        })
        .filter((d) => !!d.hotelName && !!d.date)
        .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());

      let prevHotel = "";
      const nonOwnedStayCounts = new Map<string, number>();
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
        const stayKey = isOwned
          ? null
          : getStayKey(hotelName, (() => {
              const hotelLower = hotelName.toLowerCase();
              const stayIndex = nonOwnedStayCounts.get(hotelLower) || 0;
              nonOwnedStayCounts.set(hotelLower, stayIndex + 1);
              return stayIndex;
            })());
        const key = format(date, "yyyy-MM-dd");
        const list = map.get(key) || [];
        list.push({
          confirmationId,
          dateKey: key,
          hotel: hotelName,
          code,
          client,
          isOwned,
          stayKey,
        });
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
  const hotelViewLabel = hotelView === "owned" ? "Owned hotels" : hotelView === "other" ? "Other hotels" : "All hotels";
  const contentViewLabel = useMemo(() => {
    if (effectiveCalendarContentMode === "payments") return "Payments only";
    if (effectiveCalendarContentMode === "both") return checkInsOnly ? "Check-ins + payments" : "All stay days + payments";
    return checkInsOnly ? "Check-ins only" : "All stay days";
  }, [effectiveCalendarContentMode, checkInsOnly]);
  const viewingSummary =
    effectiveCalendarContentMode === "payments"
      ? "Payments only"
      : `${hotelViewLabel} · ${contentViewLabel}`;
  const dayNumberFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { day: "numeric" }),
    []
  );

  const days: Date[] = [];
  for (let day = calendarStart; day <= calendarEnd; day = addDays(day, 1)) {
    days.push(day);
  }

  const showHotelStays = effectiveCalendarContentMode !== "payments";
  const showSalaryPayments = canSeeSalaries && effectiveCalendarContentMode !== "stays";
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

  const invoiceAmountByConfirmationStay = useMemo(() => {
    const result = new Map<string, { amount: number; currency: "USD" | "GEL" }>();
    if (!confirmations?.length) return result;

    for (const c of confirmations) {
      const payload = (c.raw_payload && typeof c.raw_payload === "object")
        ? (c.raw_payload as Record<string, unknown>)
        : {};
      const invoiceAmounts = payload.invoice_amounts && typeof payload.invoice_amounts === "object"
        ? (payload.invoice_amounts as Record<string, unknown>)
        : {};
      const attachmentStayMap = payload.attachment_stay_map && typeof payload.attachment_stay_map === "object"
        ? (payload.attachment_stay_map as Record<string, string>)
        : {};

      for (const [attachmentId, value] of Object.entries(invoiceAmounts)) {
        const stayKey = attachmentStayMap[attachmentId];
        if (!stayKey) continue;

        let amount = 0;
        let currency: "USD" | "GEL" = "USD";

        if (typeof value === "number") {
          amount = value;
        } else if (value && typeof value === "object") {
          const valueRecord = value as Record<string, unknown>;
          amount = Number(valueRecord.amount || 0);
          currency = valueRecord.currency === "GEL" ? "GEL" : "USD";
        }

        if (!Number.isFinite(amount) || amount <= 0) continue;
        result.set(`${c.id}::${stayKey}`, { amount, currency });
      }
    }

    return result;
  }, [confirmations]);

  // Owned hotels that have room tracking on.
  const ownedRoomHotels = useMemo(
    () => (savedHotels || []).filter((h) => h.is_owned && h.room_count != null),
    [savedHotels]
  );

  // Rooms booked per day per owned hotel, summed across all confirmations.
  // Keyed dateKey -> hotelNameLower -> rooms. Uses the same stay grouping as the
  // confirmation form so the room_usage keys line up.
  const bookedRoomsByDate = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    if (!confirmations || ownedRoomHotels.length === 0) return map;
    for (const c of confirmations) {
      const usage = c.raw_payload?.room_usage || {};
      const stays = getOwnedRoomStays(c.raw_payload?.itinerary || [], savedHotels || []);
      for (const stay of stays) {
        const rooms = Number(usage[stay.stayKey] || 0);
        if (rooms <= 0) continue;
        const hotelLower = stay.hotelName.trim().toLowerCase();
        for (const raw of stay.dates) {
          const parsed = parseDateFlexible(raw);
          if (!parsed) continue;
          const dk = format(parsed, "yyyy-MM-dd");
          const inner = map.get(dk) || new Map<string, number>();
          inner.set(hotelLower, (inner.get(hotelLower) || 0) + rooms);
          map.set(dk, inner);
        }
      }
    }
    return map;
  }, [confirmations, savedHotels, ownedRoomHotels]);

  const selectedRoomsByHotel = selectedKey ? bookedRoomsByDate.get(selectedKey) : undefined;


  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-4">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-foreground">Calendar</h1>
          <p className="text-muted-foreground">Hotel stays.</p>
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
                            effectiveCalendarContentMode === opt.key
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
                    {hotelViewLabel}
                    {showHotelStays ? (checkInsOnly ? " - check-ins only" : " - all stay days") : " - stays hidden"}
                    {showSalaryPayments ? " - salary payments" : ""}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center rounded-xl border border-[#0F4C5C]/15 bg-white px-3 py-1.5 text-xs text-[#0F4C5C] shadow-[0_6px_18px_rgba(15,76,92,0.06)]">
                <span className="font-semibold">Viewing:</span>
                <span className="ml-1.5">{viewingSummary}</span>
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
                  {selectedStays.map((s, idx) => {
                    const invoiceInfo = s.stayKey
                      ? invoiceAmountByConfirmationStay.get(`${s.confirmationId}::${s.stayKey}`)
                      : null;
                    return (
                      <div
                        key={`${s.dateKey}-${s.confirmationId}-${idx}`}
                        className="flex items-center justify-between rounded-xl border border-[#0F4C5C]/10 bg-white/90 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{s.hotel}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {s.code} {s.client ? ` - ${s.client}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {invoiceInfo && (
                            <Badge className="border-0 bg-amber-100 text-amber-800">
                              {currencySymbol(invoiceInfo.currency)}
                              {Math.round(invoiceInfo.amount).toLocaleString()}
                            </Badge>
                          )}
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
                      </div>
                    );
                  })}
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

              {(() => {
                // ponytail: per-currency sum of everything shown above (USD + GEL can't merge into one number)
                const totals: Record<string, number> = {};
                for (const s of selectedStays) {
                  const info = s.stayKey
                    ? invoiceAmountByConfirmationStay.get(`${s.confirmationId}::${s.stayKey}`)
                    : null;
                  if (info) totals[info.currency] = (totals[info.currency] || 0) + info.amount;
                }
                if (showSalaryPayments) {
                  for (const s of selectedSalaries) {
                    totals[s.currency] = (totals[s.currency] || 0) + s.amount;
                  }
                }
                const entries = Object.entries(totals).filter(([, v]) => v > 0);
                if (entries.length === 0) return null;
                return (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[#0F4C5C]/20 bg-[#EAF7F8]/70 px-3 py-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#0F4C5C]">Total due</span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {entries.map(([currency, amount]) => (
                        <Badge key={currency} className="border-0 bg-[#0F4C5C] text-white text-sm font-semibold px-2.5 py-0.5">
                          {currencySymbol(currency)}
                          {Math.round(amount).toLocaleString()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Owned-hotel room occupancy for the selected day */}
          {ownedRoomHotels.length > 0 && (
            <>
              <Separator className="my-4 bg-border/70" />
              <div className="space-y-2.5">
                <div className="text-xs font-medium text-muted-foreground">Our hotels — rooms booked</div>
                {ownedRoomHotels.map((hotel) => {
                  const total = hotel.room_count as number;
                  const booked = selectedRoomsByHotel?.get(hotel.name.trim().toLowerCase()) || 0;
                  const filled = Math.min(booked, total);
                  const over = booked > total;
                  return (
                    <div key={hotel.id} className="rounded-xl border border-[#0F4C5C]/10 bg-white/90 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{hotel.name}</span>
                        <span className={cn("text-xs font-semibold tabular-nums", over ? "text-amber-600" : "text-[#0F4C5C]")}>
                          {booked}/{total}
                        </span>
                      </div>
                      {/* ponytail: one icon per room; assumes modest counts (cottages). Falls back to a bar above ~24. */}
                      {total <= 24 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Array.from({ length: total }).map((_, i) => (
                            <Home
                              key={i}
                              className={cn("h-4 w-4", i < filled ? "text-[#12A6C2]" : "text-muted-foreground/30")}
                              fill={i < filled ? "#12A6C2" : "none"}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1.5 h-2 w-full rounded-full bg-[#0F4C5C]/10 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", over ? "bg-amber-500" : "bg-[#12A6C2]")}
                            style={{ width: `${Math.min(100, (booked / total) * 100)}%` }}
                          />
                        </div>
                      )}
                      {over && (
                        <p className="mt-1 text-[11px] font-medium text-amber-600">Overbooked by {booked - total}.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
