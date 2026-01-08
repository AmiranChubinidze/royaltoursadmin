-- Add currency column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

-- Add comment for clarity
COMMENT ON COLUMN public.transactions.currency IS 'Original currency the transaction was entered in (USD or GEL)';