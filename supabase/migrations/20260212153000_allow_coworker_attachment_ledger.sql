-- Allow coworker uploads from Confirmation Attachments to create/update
-- their hotel payment/invoice ledger rows in a restricted scope.

-- Transactions: limited to confirmation-linked hotel expense rows created from attachments.
drop policy if exists "Coworker can insert attachment ledger transactions" on public.transactions;
create policy "Coworker can insert attachment ledger transactions"
on public.transactions
for insert
with check (
  has_role(auth.uid(), 'coworker'::app_role)
  and confirmation_id is not null
  and kind = 'out'
  and type = 'expense'
  and category = 'hotel'
  and (description ilike 'Payment:%' or description ilike 'Invoice:%')
);

drop policy if exists "Coworker can update attachment ledger transactions" on public.transactions;
create policy "Coworker can update attachment ledger transactions"
on public.transactions
for update
using (
  has_role(auth.uid(), 'coworker'::app_role)
  and confirmation_id is not null
  and kind = 'out'
  and type = 'expense'
  and category = 'hotel'
  and (description ilike 'Payment:%' or description ilike 'Invoice:%')
)
with check (
  has_role(auth.uid(), 'coworker'::app_role)
  and confirmation_id is not null
  and kind = 'out'
  and type = 'expense'
  and category = 'hotel'
  and (description ilike 'Payment:%' or description ilike 'Invoice:%')
);

-- Expenses: same restricted scope for attachment-linked hotel expense rows.
drop policy if exists "Coworker can insert attachment expenses" on public.expenses;
create policy "Coworker can insert attachment expenses"
on public.expenses
for insert
with check (
  has_role(auth.uid(), 'coworker'::app_role)
  and confirmation_id is not null
  and expense_type = 'hotel'
  and (description ilike 'Payment:%' or description ilike 'Invoice:%')
);

drop policy if exists "Coworker can update attachment expenses" on public.expenses;
create policy "Coworker can update attachment expenses"
on public.expenses
for update
using (
  has_role(auth.uid(), 'coworker'::app_role)
  and confirmation_id is not null
  and expense_type = 'hotel'
  and (description ilike 'Payment:%' or description ilike 'Invoice:%')
)
with check (
  has_role(auth.uid(), 'coworker'::app_role)
  and confirmation_id is not null
  and expense_type = 'hotel'
  and (description ilike 'Payment:%' or description ilike 'Invoice:%')
);

