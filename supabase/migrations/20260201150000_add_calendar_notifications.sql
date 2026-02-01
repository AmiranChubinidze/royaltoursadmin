create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

create table if not exists public.calendar_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  time_local text not null default '09:00',
  tz_offset_min integer not null default 0,
  use_all_hotels boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_notification_hotels (
  user_id uuid not null references auth.users(id) on delete cascade,
  hotel_id uuid not null references public.saved_hotels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, hotel_id)
);

create table if not exists public.calendar_notification_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  date_local date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, date_local)
);

alter table public.calendar_notification_settings enable row level security;
alter table public.calendar_notification_hotels enable row level security;
alter table public.calendar_notification_logs enable row level security;

create policy "Users can read their notification settings"
  on public.calendar_notification_settings
  for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users can upsert their notification settings"
  on public.calendar_notification_settings
  for insert
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users can update their notification settings"
  on public.calendar_notification_settings
  for update
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users can read their notification hotels"
  on public.calendar_notification_hotels
  for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users can insert their notification hotels"
  on public.calendar_notification_hotels
  for insert
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users can delete their notification hotels"
  on public.calendar_notification_hotels
  for delete
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins can read notification logs"
  on public.calendar_notification_logs
  for select
  using (public.has_role(auth.uid(), 'admin'));

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'calendar-arrival-reminders') then
    perform cron.schedule(
      'calendar-arrival-reminders',
      '*/15 * * * *',
      $job$
      select net.http_post(
        url := 'https://ivjycxegcunbamdmwbzg.supabase.co/functions/v1/send-arrival-reminders',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $job$
    );
  end if;
end $$;
