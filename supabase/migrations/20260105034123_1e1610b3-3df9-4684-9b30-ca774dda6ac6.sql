-- Remove the category check constraint to allow custom categories
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_check;