-- Allow coworker to view and upload confirmation attachments

-- confirmation_attachments SELECT policy
DROP POLICY IF EXISTS "Booking, Worker, Admin can view attachments" ON public.confirmation_attachments;
CREATE POLICY "Booking, Worker, Coworker, Admin can view attachments"
ON public.confirmation_attachments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'worker'::app_role) OR
  has_role(auth.uid(), 'booking'::app_role) OR
  has_role(auth.uid(), 'coworker'::app_role)
);

-- confirmation_attachments INSERT policy
DROP POLICY IF EXISTS "Booking, Worker, Admin can insert attachments" ON public.confirmation_attachments;
CREATE POLICY "Booking, Worker, Coworker, Admin can insert attachments"
ON public.confirmation_attachments
FOR INSERT
TO public
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'worker'::app_role) OR
  has_role(auth.uid(), 'booking'::app_role) OR
  has_role(auth.uid(), 'coworker'::app_role)
);

-- storage.objects SELECT policy
DROP POLICY IF EXISTS "Booking, Worker, Admin can view attachments" ON storage.objects;
CREATE POLICY "Booking, Worker, Coworker, Admin can view attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'confirmation-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'worker'::app_role) OR
    has_role(auth.uid(), 'booking'::app_role) OR
    has_role(auth.uid(), 'coworker'::app_role)
  )
);

-- storage.objects INSERT policy
DROP POLICY IF EXISTS "Booking, Worker, Admin can upload attachments" ON storage.objects;
CREATE POLICY "Booking, Worker, Coworker, Admin can upload attachments"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'confirmation-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'worker'::app_role) OR
    has_role(auth.uid(), 'booking'::app_role) OR
    has_role(auth.uid(), 'coworker'::app_role)
  )
);
