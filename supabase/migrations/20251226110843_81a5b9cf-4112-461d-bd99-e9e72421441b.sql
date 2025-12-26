-- Update RLS policies on confirmations table to restrict write access to admin and worker
DROP POLICY IF EXISTS "Authenticated users can access confirmations" ON public.confirmations;

-- All authenticated users can view confirmations
CREATE POLICY "Authenticated users can view confirmations"
ON public.confirmations
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admin and worker can insert confirmations
CREATE POLICY "Admin and worker can insert confirmations"
ON public.confirmations
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'worker')
);

-- Only admin and worker can update confirmations
CREATE POLICY "Admin and worker can update confirmations"
ON public.confirmations
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'worker')
);

-- Only admin and worker can delete confirmations
CREATE POLICY "Admin and worker can delete confirmations"
ON public.confirmations
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'worker')
);