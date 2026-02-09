-- Add salary fields to owners for monthly salary scheduling
-- Salary definitions live on owners to reuse existing RLS policies (admin/accountant manage; worker view).

alter table public.owners
  add column if not exists salary_amount numeric,
  add column if not exists salary_due_day integer,
  add column if not exists salary_currency text not null default 'GEL';

-- Basic validation (allow nulls; enforce range when provided).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'owners_salary_due_day_range'
  ) then
    alter table public.owners
      add constraint owners_salary_due_day_range
      check (salary_due_day is null or (salary_due_day >= 1 and salary_due_day <= 31));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'owners_salary_currency_allowed'
  ) then
    alter table public.owners
      add constraint owners_salary_currency_allowed
      check (salary_currency in ('GEL', 'USD'));
  end if;
end $$;
