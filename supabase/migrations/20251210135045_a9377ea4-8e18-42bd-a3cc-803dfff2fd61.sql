-- Drop saved_clients table entirely
DROP TABLE IF EXISTS public.saved_clients;

-- Remove phone column and add activities column to saved_hotels
ALTER TABLE public.saved_hotels DROP COLUMN IF EXISTS phone;
ALTER TABLE public.saved_hotels ADD COLUMN activities text[] DEFAULT '{}'::text[];