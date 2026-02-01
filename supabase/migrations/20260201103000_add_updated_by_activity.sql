alter table public.transactions
  add column if not exists updated_by uuid;

alter table public.confirmations
  add column if not exists updated_by uuid;

create or replace function public.set_updated_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_by_transactions on public.transactions;
create trigger trg_set_updated_by_transactions
before insert or update on public.transactions
for each row
execute function public.set_updated_by();

drop trigger if exists trg_set_updated_by_confirmations on public.confirmations;
create trigger trg_set_updated_by_confirmations
before insert or update on public.confirmations
for each row
execute function public.set_updated_by();
