-- Update salary profile RPC to support monthly and weekly schedules.
-- Drops the previous signature and recreates the function with schedule parameters.

drop function if exists public.upsert_salary_profile(text, numeric, integer, text);

create or replace function public.upsert_salary_profile(
  _name text,
  _amount numeric,
  _frequency text default 'monthly',
  _due_day integer default null,
  _due_weekday integer default null,
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
  if _currency not in ('GEL', 'USD') then
    raise exception 'invalid currency';
  end if;
  if _frequency not in ('monthly', 'weekly') then
    raise exception 'invalid frequency';
  end if;

  if _frequency = 'monthly' then
    if _due_day is null or _due_day < 1 or _due_day > 31 then
      raise exception 'invalid due day';
    end if;
  else
    if _due_weekday is null or _due_weekday < 1 or _due_weekday > 7 then
      raise exception 'invalid due weekday';
    end if;
  end if;

  insert into public.owners (
    name,
    is_active,
    salary_amount,
    salary_currency,
    salary_frequency,
    salary_due_day,
    salary_due_weekday
  )
  values (
    trim(_name),
    true,
    _amount,
    _currency,
    _frequency,
    case when _frequency = 'monthly' then _due_day else null end,
    case when _frequency = 'weekly' then _due_weekday else null end
  )
  on conflict (name) do update
    set is_active = true,
        salary_amount = excluded.salary_amount,
        salary_currency = excluded.salary_currency,
        salary_frequency = excluded.salary_frequency,
        salary_due_day = excluded.salary_due_day,
        salary_due_weekday = excluded.salary_due_weekday
  returning * into result;

  return result;
end;
$$;

grant execute on function public.upsert_salary_profile(text, numeric, text, integer, integer, text) to authenticated;

