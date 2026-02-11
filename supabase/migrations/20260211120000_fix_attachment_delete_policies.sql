-- Fix: Allow workers to delete any attachment, not just their own uploads.
-- The UI already shows delete buttons for all workers, but RLS was restricting
-- workers to only delete attachments they uploaded themselves.

-- 1. Update confirmation_attachments DELETE policy
DROP POLICY IF EXISTS "Users can delete own, Admin can delete any" ON public.confirmation_attachments;
CREATE POLICY "Worker and Admin can delete attachments"
ON public.confirmation_attachments
FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'worker'::app_role)
);

-- 2. Update storage DELETE policy
DROP POLICY IF EXISTS "Users can delete own, Admin can delete any attachments" ON storage.objects;
CREATE POLICY "Worker and Admin can delete attachments"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'confirmation-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'worker'::app_role)
  )
);
