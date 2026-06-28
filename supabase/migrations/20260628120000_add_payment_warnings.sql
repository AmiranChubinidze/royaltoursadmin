-- Daily "guest arrives today + hotel not marked paid" warning email.
-- Rides the same pg_cron + edge-function pattern as calendar-arrival-reminders,
-- but with its own de-dup log so the two emails never block each other.

create table if not exists public.payment_warning_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  date_local date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, date_local)
);

alter table public.payment_warning_logs enable row level security;

create policy "Admins can read payment warning logs"
  on public.payment_warning_logs
  for select
  using (public.has_role(auth.uid(), 'admin'));

-- Every 15 min: ping the warning function. It self-gates to one send/day per
-- user at their configured reminder time and de-dups via payment_warning_logs.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'payment-warnings') then
    perform cron.schedule(
      'payment-warnings',
      '*/15 * * * *',
      $job$
      select net.http_post(
        url := 'https://ivjycxegcunbamdmwbzg.supabase.co/functions/v1/send-payment-warnings',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $job$
    );
  end if;
end $$;
