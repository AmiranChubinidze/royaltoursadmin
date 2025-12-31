-- Add client_paid fields to track when clients pay us
ALTER TABLE public.confirmations 
ADD COLUMN IF NOT EXISTS client_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS client_paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS client_paid_by uuid;