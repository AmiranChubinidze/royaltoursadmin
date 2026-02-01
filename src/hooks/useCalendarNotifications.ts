import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CalendarNotificationSettings {
  user_id: string;
  enabled: boolean;
  time_local: string;
  tz_offset_min: number;
  use_all_hotels: boolean;
  remind_offset_days: number;
}

export const useCalendarNotificationSettings = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calendar-notification-settings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_notification_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as CalendarNotificationSettings | null;
    },
  });
};

export const useCalendarNotificationHotels = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calendar-notification-hotels", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_notification_hotels")
        .select("hotel_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []).map((d) => d.hotel_id as string);
    },
  });
};

export const useUpsertCalendarNotificationSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<CalendarNotificationSettings>) => {
      const payload: CalendarNotificationSettings = {
        user_id: user!.id,
        enabled: settings.enabled ?? false,
        time_local: settings.time_local || "09:00",
        tz_offset_min: settings.tz_offset_min ?? 0,
        use_all_hotels: settings.use_all_hotels ?? true,
        remind_offset_days: settings.remind_offset_days ?? 1,
      };
      const { data, error } = await supabase
        .from("calendar_notification_settings")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as CalendarNotificationSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-notification-settings"] });
    },
  });
};

export const useSetCalendarNotificationHotels = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hotelIds: string[]) => {
      if (!user?.id) return;
      // Replace selections
      await supabase
        .from("calendar_notification_hotels")
        .delete()
        .eq("user_id", user.id);
      if (hotelIds.length > 0) {
        const rows = hotelIds.map((hotel_id) => ({ user_id: user.id, hotel_id }));
        const { error } = await supabase
          .from("calendar_notification_hotels")
          .insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-notification-hotels"] });
    },
  });
};
