-- Drop the existing SELECT policy that's too restrictive
DROP POLICY IF EXISTS "Accountant and Admin can view settings" ON public.app_settings;

-- Create a new policy that allows all authenticated users to read settings
CREATE POLICY "Authenticated users can view settings" 
ON public.app_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);