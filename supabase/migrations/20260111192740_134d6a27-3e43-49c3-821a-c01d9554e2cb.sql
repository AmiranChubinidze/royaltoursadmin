-- Drop the existing kind check constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_kind_check;

-- Add the updated check constraint that includes 'exchange'
ALTER TABLE public.transactions ADD CONSTRAINT transactions_kind_check 
  CHECK (kind IN ('in', 'out', 'transfer', 'exchange'));