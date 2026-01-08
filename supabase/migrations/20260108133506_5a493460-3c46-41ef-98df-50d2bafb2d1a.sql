-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Booking and Admin can insert attachments" ON public.confirmation_attachments;
DROP POLICY IF EXISTS "Booking and Admin can upload attachments" ON storage.objects;

-- Create new INSERT policies that include worker role
CREATE POLICY "Booking, Worker, Admin can insert attachments"
ON public.confirmation_attachments
FOR INSERT
TO public
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'booking'::app_role) OR
  has_role(auth.uid(), 'worker'::app_role)
);

CREATE POLICY "Booking, Worker, Admin can upload attachments"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'confirmation-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'booking'::app_role) OR
    has_role(auth.uid(), 'worker'::app_role)
  )
);

-- Also update DELETE policy to allow workers to delete their own uploads
DROP POLICY IF EXISTS "Booking can delete own, Admin can delete any" ON public.confirmation_attachments;
DROP POLICY IF EXISTS "Booking can delete own, Admin can delete any attachments" ON storage.objects;

CREATE POLICY "Users can delete own, Admin can delete any"
ON public.confirmation_attachments
FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  ((has_role(auth.uid(), 'booking'::app_role) OR has_role(auth.uid(), 'worker'::app_role)) AND uploaded_by = auth.uid())
);

CREATE POLICY "Users can delete own, Admin can delete any attachments"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'confirmation-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    ((has_role(auth.uid(), 'booking'::app_role) OR has_role(auth.uid(), 'worker'::app_role)) AND (auth.uid())::text = (storage.foldername(name))[1])
  )
);