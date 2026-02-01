alter table public.holders
  add column if not exists user_id uuid;

alter table public.holders
  add constraint if not exists holders_user_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete set null;

create index if not exists holders_user_id_idx
  on public.holders(user_id);
