-- Add status column to confirmations for draft system
ALTER TABLE public.confirmations 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

-- Add hotels_emailed column to track which hotels were contacted
ALTER TABLE public.confirmations 
ADD COLUMN IF NOT EXISTS hotels_emailed TEXT[] DEFAULT '{}';

-- Update RLS: Allow booking role to INSERT drafts
CREATE POLICY "Booking can insert drafts"
ON public.confirmations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'booking'::app_role) AND status = 'draft'
);

-- Update RLS: Allow booking role to view their drafts (they can already view via authenticated policy)
-- No change needed since "Authenticated users can view confirmations" already covers this

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_confirmations_status ON public.confirmations(status);