import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useSavedHotels } from "@/hooks/useSavedData";
import { useToast } from "@/hooks/use-toast";
import {
  useCalendarNotificationHotels,
  useCalendarNotificationSettings,
  useSetCalendarNotificationHotels,
  useUpsertCalendarNotificationSettings,
} from "@/hooks/useCalendarNotifications";

// One hotel-scope row: "All" toggle, and when off, a compact pick-list.
function HotelScope({
  label,
  useAll,
  onToggleAll,
  hotels,
  emptyText,
  selectedSet,
  onToggleHotel,
  accent,
}: {
  label: string;
  useAll: boolean;
  onToggleAll: (checked: boolean) => void;
  hotels: { id: string; name: string }[];
  emptyText: string;
  selectedSet: Set<string>;
  onToggleHotel: (id: string) => void;
  accent: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-medium text-[#0F4C5C]">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{useAll ? "All" : "Specific"}</span>
          <Switch checked={useAll} onCheckedChange={onToggleAll} aria-label={`Use all ${label}`} />
        </div>
      </div>
      {!useAll && (
        <div className="rounded-xl border border-border/60 bg-[#F7FAFB] p-1">
          <ScrollArea className="h-[132px]">
            <div className="space-y-1 p-1">
              {hotels.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">{emptyText}</div>
              ) : (
                hotels.map((hotel) => {
                  const checked = selectedSet.has(hotel.id);
                  return (
                    <button
                      key={hotel.id}
                      type="button"
                      onClick={() => onToggleHotel(hotel.id)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2",
                        checked
                          ? "border-current bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
                          : "border-transparent bg-white/70 hover:bg-white"
                      )}
                      style={{ color: checked ? accent : undefined }}
                    >
                      <span className="min-w-0 truncate text-xs font-medium text-foreground">
                        {hotel.name}
                      </span>
                      <Checkbox
                        checked={checked}
                        className="pointer-events-none h-4 w-4 rounded border-border/70"
                        style={
                          checked
                            ? ({ backgroundColor: accent, borderColor: accent, color: "#fff" } as React.CSSProperties)
                            : undefined
                        }
                      />
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// Arrival-reminder settings. Self-contained: owns its own state, hooks and
// persistence. Moved out of CalendarPage into the Settings page.
export default function RemindersSettings() {
  const { data: savedHotels } = useSavedHotels();
  const { data: notificationSettings } = useCalendarNotificationSettings();
  const { data: selectedHotelIds } = useCalendarNotificationHotels();
  const upsertSettings = useUpsertCalendarNotificationSettings();
  const setNotificationHotels = useSetCalendarNotificationHotels();
  const { toast } = useToast();

  const [timeLocal, setTimeLocal] = useState("09:00");
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

  const ownedHotels = useMemo(
    () => (savedHotels || []).filter((h) => h.is_owned),
    [savedHotels]
  );
  const otherHotels = useMemo(
    () => (savedHotels || []).filter((h) => !h.is_owned),
    [savedHotels]
  );
  const selectedSet = useMemo(
    () => new Set(selectedHotelIdsState || []),
    [selectedHotelIdsState]
  );
  const tzOffset = tzOffsetState;

  // Inline chip styling for the sentence-line selects (auto width, sits in flowing text).
  const inlineChip =
    "inline-flex h-7 w-auto rounded-lg border-[#0F4C5C]/20 bg-white px-2.5 text-xs font-semibold text-[#0F4C5C] align-middle shadow-sm";

  const updateSettings = (
    next: Partial<{
      enabled: boolean;
      time_local: string;
      use_all_hotels: boolean;
      use_all_other_hotels: boolean;
      remind_offset_days: number;
    }>
  ) => {
    setPendingSettings((prev) => ({ ...prev, ...next }));
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
    <Card className="rounded-2xl border border-[#0F4C5C]/10 bg-white shadow-[0_10px_24px_rgba(15,76,92,0.08)]">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#EAF7F8] border border-[#0F4C5C]/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-[#0F4C5C]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#0F4C5C]">Arrival Reminders</div>
                <p className="text-[11px] text-muted-foreground">
                  Email you before guests arrive.
                </p>
              </div>
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

          {/* Sentence line — the "when". Two inline chips: offset + time of day. */}
          <div className="rounded-xl border border-border/60 bg-[#F7FAFB] px-3.5 py-3 text-sm leading-9 text-[#0F4C5C]">
            <span className="text-muted-foreground">Remind me</span>{" "}
            <Select
              value={String(pendingSettings.remind_offset_days)}
              onValueChange={(value) => {
                const nextValue = Number(value);
                setRemindOffsetDays(nextValue);
                updateSettings({ remind_offset_days: nextValue });
              }}
            >
              <SelectTrigger className={inlineChip}>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">same day</SelectItem>
                <SelectItem value="1">1 day before</SelectItem>
                <SelectItem value="2">2 days before</SelectItem>
                <SelectItem value="3">3 days before</SelectItem>
              </SelectContent>
            </Select>{" "}
            <span className="text-muted-foreground">arrival, at</span>{" "}
            <Select
              value={pendingSettings.time_local}
              onValueChange={(value) => {
                setTimeLocal(value);
                updateSettings({ time_local: value });
              }}
            >
              <SelectTrigger className={inlineChip}>
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

          <Separator className="bg-border/70" />

          <HotelScope
            label="Owned hotels"
            useAll={pendingSettings.use_all_hotels}
            onToggleAll={(checked) => {
              setUseAllHotelsState(checked);
              updateSettings({ use_all_hotels: checked });
            }}
            hotels={ownedHotels}
            emptyText="No owned hotels saved yet."
            selectedSet={selectedSet}
            onToggleHotel={toggleHotelSelection}
            accent="#0F4C5C"
          />

          <HotelScope
            label="Other hotels"
            useAll={pendingSettings.use_all_other_hotels}
            onToggleAll={(checked) => {
              setUseAllOtherHotelsState(checked);
              updateSettings({ use_all_other_hotels: checked });
            }}
            hotels={otherHotels}
            emptyText="No other hotels saved yet."
            selectedSet={selectedSet}
            onToggleHotel={toggleHotelSelection}
            accent="#4B4F55"
          />

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
      </CardContent>
    </Card>
  );
}
