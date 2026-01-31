-- Change transactions.confirmation_id FK from ON DELETE SET NULL to ON DELETE CASCADE
-- so that deleting a confirmation automatically removes all linked transactions,
-- preventing orphaned ledger entries.

ALTER TABLE public.transactions
  DROP CONSTRAINT transactions_confirmation_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_confirmation_id_fkey
  FOREIGN KEY (confirmation_id)
  REFERENCES public.confirmations(id)
  ON DELETE CASCADE;
