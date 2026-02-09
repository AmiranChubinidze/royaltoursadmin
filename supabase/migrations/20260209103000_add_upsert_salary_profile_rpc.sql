-- RPC to allow managers (worker/admin/accountant) to upsert salary profiles safely.
-- Uses SECURITY DEFINER to bypass RLS on owners while enforcing role checks in the function.

create or replace function public.upsert_salary_profile(
  _name text,
  _amount numeric,
  _due_day integer,
  _currency text default 'GEL'
)
returns public.owners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.owners;
begin
  if not (
    has_role(auth.uid(), 'admin'::app_role) or
    has_role(auth.uid(), 'accountant'::app_role) or
    has_role(auth.uid(), 'worker'::app_role)
  ) then
    raise exception 'not authorized';
  end if;

  if _name is null or length(trim(_name)) < 2 then
    raise exception 'invalid name';
  end if;
  if _amount is null or _amount <= 0 then
    raise exception 'invalid amount';
  end if;
  if _due_day is null or _due_day < 1 or _due_day > 31 then
    raise exception 'invalid due day';
  end if;
  if _currency not in ('GEL', 'USD') then
    raise exception 'invalid currency';
  end if;

  insert into public.owners (name, is_active, salary_amount, salary_due_day, salary_currency)
  values (trim(_name), true, _amount, _due_day, _currency)
  on conflict (name) do update
    set is_active = true,
        salary_amount = excluded.salary_amount,
        salary_due_day = excluded.salary_due_day,
        salary_currency = excluded.salary_currency
  returning * into result;

  return result;
end;
$$;

grant execute on function public.upsert_salary_profile(text, numeric, integer, text) to authenticated;

