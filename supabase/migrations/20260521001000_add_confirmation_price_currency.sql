-- Tour price can now be entered in USD or GEL (default USD). Existing rows were
-- all priced in USD.
ALTER TABLE public.confirmations
  ADD COLUMN IF NOT EXISTS price_currency text NOT NULL DEFAULT 'USD';
