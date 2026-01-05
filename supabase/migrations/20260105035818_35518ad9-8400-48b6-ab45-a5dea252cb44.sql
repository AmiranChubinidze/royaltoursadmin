-- Create booking_drafts table for storing email drafts before transfer to confirmations
CREATE TABLE public.booking_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  hotel_bookings JSONB NOT NULL,
  guest_info JSONB NOT NULL,
  emails_sent BOOLEAN DEFAULT false,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.booking_drafts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage drafts
CREATE POLICY "Authenticated users can view drafts"
ON public.booking_drafts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create drafts"
ON public.booking_drafts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update drafts"
ON public.booking_drafts FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete drafts"
ON public.booking_drafts FOR DELETE
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_booking_drafts_updated_at
BEFORE UPDATE ON public.booking_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();