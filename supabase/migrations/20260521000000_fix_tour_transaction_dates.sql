-- Fix historical tour-payment transactions whose date was written as DD/MM/YYYY.
-- transactions.date is a DATE column; Postgres read those strings as MM/DD, so
-- days <= 12 were stored month/day-swapped and days > 12 were rejected outright
-- (the confirmation row had already been inserted), leaving no pending income row.
--
-- For auto-generated tour-payment rows the correct date is the confirmation's
-- arrival_date, so we can reliably reset them.

-- 1) Reset the date of existing auto tour-payment transactions from their confirmation.
UPDATE public.transactions t
SET date = to_date(c.arrival_date, 'DD/MM/YYYY')
FROM public.confirmations c
WHERE t.confirmation_id = c.id
  AND t.category = 'tour_payment'
  AND t.is_auto_generated = true
  AND c.arrival_date ~ '^\d{2}/\d{2}/\d{4}$';

-- 2) Recreate pending tour-payment rows that were lost (priced confirmations with
--    no auto tour-payment transaction at all).
INSERT INTO public.transactions
  (date, confirmation_id, kind, type, status, category, description, amount, currency, is_paid, is_auto_generated)
SELECT
  to_date(c.arrival_date, 'DD/MM/YYYY'),
  c.id,
  'in',
  'income',
  'pending',
  'tour_payment',
  'Tour payment - ' || COALESCE(NULLIF(c.main_client_name, ''), c.confirmation_code),
  c.price,
  'USD',
  false,
  true
FROM public.confirmations c
WHERE c.price IS NOT NULL
  AND c.price > 0
  AND c.arrival_date ~ '^\d{2}/\d{2}/\d{4}$'
  AND NOT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.confirmation_id = c.id
      AND t.category = 'tour_payment'
      AND t.is_auto_generated = true
  );
