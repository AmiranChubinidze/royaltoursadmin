-- Owned-hotel room tracking: total rooms per hotel.
-- Additive, nullable. NULL = room tracking off for that hotel.
-- Only meaningful for is_owned = true hotels.
alter table public.saved_hotels
  add column if not exists room_count int;
