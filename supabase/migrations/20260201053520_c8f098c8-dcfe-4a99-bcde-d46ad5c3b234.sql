-- Add missing columns to saved_hotels
ALTER TABLE public.saved_hotels ADD COLUMN IF NOT EXISTS is_owned BOOLEAN NOT NULL DEFAULT false;

-- Add missing columns to holders
ALTER TABLE public.holders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add missing column to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create calendar notification settings table
CREATE TABLE IF NOT EXISTS public.calendar_notification_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    time_local TEXT NOT NULL DEFAULT '09:00',
    tz_offset_min INTEGER NOT NULL DEFAULT 0,
    use_all_hotels BOOLEAN NOT NULL DEFAULT true,
    remind_offset_days INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on calendar_notification_settings
ALTER TABLE public.calendar_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_notification_settings
CREATE POLICY "Users can view their own notification settings"
ON public.calendar_notification_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
ON public.calendar_notification_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
ON public.calendar_notification_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Create calendar notification hotels table
CREATE TABLE IF NOT EXISTS public.calendar_notification_hotels (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES public.saved_hotels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, hotel_id)
);

-- Enable RLS on calendar_notification_hotels
ALTER TABLE public.calendar_notification_hotels ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_notification_hotels
CREATE POLICY "Users can view their own hotel selections"
ON public.calendar_notification_hotels FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hotel selections"
ON public.calendar_notification_hotels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hotel selections"
ON public.calendar_notification_hotels FOR DELETE
USING (auth.uid() = user_id);