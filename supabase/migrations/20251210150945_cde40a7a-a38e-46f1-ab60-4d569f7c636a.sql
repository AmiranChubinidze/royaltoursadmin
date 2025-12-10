-- Fix confirmations table RLS - require authentication
DROP POLICY IF EXISTS "Allow all operations for confirmations" ON public.confirmations;

CREATE POLICY "Authenticated users can access confirmations"
ON public.confirmations
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix saved_hotels table RLS as well (same issue)
DROP POLICY IF EXISTS "Allow all operations for saved_hotels" ON public.saved_hotels;

CREATE POLICY "Authenticated users can access saved_hotels"
ON public.saved_hotels
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);