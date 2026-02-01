alter table public.saved_hotels
  add column if not exists is_owned boolean default false;
