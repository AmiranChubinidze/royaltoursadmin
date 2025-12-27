-- Add payment columns to confirmations table
ALTER TABLE public.confirmations 
ADD COLUMN is_paid boolean DEFAULT false,
ADD COLUMN paid_at timestamp with time zone,
ADD COLUMN paid_by uuid REFERENCES auth.users(id);

-- Create confirmation_attachments table
CREATE TABLE public.confirmation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_id uuid REFERENCES public.confirmations(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  uploaded_at timestamp with time zone DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on confirmation_attachments
ALTER TABLE public.confirmation_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for confirmation_attachments
-- Booking, Worker, Admin can view attachments
CREATE POLICY "Booking, Worker, Admin can view attachments"
ON public.confirmation_attachments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'booking'::app_role)
);

-- Booking and Admin can insert attachments
CREATE POLICY "Booking and Admin can insert attachments"
ON public.confirmation_attachments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'booking'::app_role)
);

-- Booking can delete their own attachments, Admin can delete any
CREATE POLICY "Booking can delete own, Admin can delete any"
ON public.confirmation_attachments
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'booking'::app_role) AND uploaded_by = auth.uid())
);

-- Update confirmations RLS to allow booking to update payment status
CREATE POLICY "Booking can update payment status"
ON public.confirmations
FOR UPDATE
USING (has_role(auth.uid(), 'booking'::app_role))
WITH CHECK (has_role(auth.uid(), 'booking'::app_role));

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('confirmation-attachments', 'confirmation-attachments', false);

-- Storage policies
CREATE POLICY "Booking, Worker, Admin can view attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'confirmation-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'worker'::app_role) OR 
    has_role(auth.uid(), 'booking'::app_role)
  )
);

CREATE POLICY "Booking and Admin can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'confirmation-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'booking'::app_role)
  )
);

CREATE POLICY "Booking can delete own, Admin can delete any attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'confirmation-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    (has_role(auth.uid(), 'booking'::app_role) AND auth.uid()::text = (storage.foldername(name))[1])
  )
);