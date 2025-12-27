-- Add 'booking' to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'booking';

-- Grant booking role the same RLS permissions as visitor (read-only on confirmations)
-- The existing "Authenticated users can view confirmations" policy already covers this