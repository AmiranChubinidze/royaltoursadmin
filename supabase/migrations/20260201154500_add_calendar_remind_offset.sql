alter table public.calendar_notification_settings
  add column if not exists remind_offset_days integer not null default 1;

update public.calendar_notification_settings
set remind_offset_days = 1
where remind_offset_days is null;
