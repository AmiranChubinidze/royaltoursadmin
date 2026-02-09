-- Add weekly salary scheduling fields to owners

alter table public.owners
  add column if not exists salary_frequency text not null default 'monthly',
  add column if not exists salary_due_weekday integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'owners_salary_frequency_allowed'
  ) then
    alter table public.owners
      add constraint owners_salary_frequency_allowed
      check (salary_frequency in ('monthly', 'weekly'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'owners_salary_due_weekday_range'
  ) then
    alter table public.owners
      add constraint owners_salary_due_weekday_range
      check (salary_due_weekday is null or (salary_due_weekday >= 1 and salary_due_weekday <= 7));
  end if;
end $$;

