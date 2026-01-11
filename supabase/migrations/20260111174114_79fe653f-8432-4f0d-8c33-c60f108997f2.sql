-- Add notes column to confirmations table
ALTER TABLE public.confirmations
ADD COLUMN notes text;