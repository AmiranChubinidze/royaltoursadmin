-- Add email field to holders for optional linking to user profiles
ALTER TABLE public.holders ADD COLUMN email text;

-- Add responsible_holder_id to transactions (replaces owner for income/expense)
ALTER TABLE public.transactions ADD COLUMN responsible_holder_id uuid REFERENCES public.holders(id);

-- Create index for faster lookups
CREATE INDEX idx_transactions_responsible_holder ON public.transactions(responsible_holder_id);
CREATE INDEX idx_holders_email ON public.holders(email);