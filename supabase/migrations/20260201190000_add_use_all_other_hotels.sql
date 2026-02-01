alter table public.calendar_notification_settings
  add column if not exists use_all_other_hotels boolean not null default true;

update public.calendar_notification_settings
  set use_all_other_hotels = true
  where use_all_other_hotels is null;
