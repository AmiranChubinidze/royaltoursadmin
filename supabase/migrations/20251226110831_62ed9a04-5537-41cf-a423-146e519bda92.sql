-- Add 'worker' and 'visitor' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'worker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'visitor';