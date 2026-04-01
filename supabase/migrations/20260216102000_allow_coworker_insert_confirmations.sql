-- Allow coworker role to create tour confirmations
drop policy if exists "Coworker can insert confirmations" on public.confirmations;

create policy "Coworker can insert confirmations"
on public.confirmations
for insert
with check (
  has_role(auth.uid(), 'coworker'::app_role)
);
