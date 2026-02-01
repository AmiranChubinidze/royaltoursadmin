-- Add missing updated_by column to confirmations
ALTER TABLE public.confirmations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);