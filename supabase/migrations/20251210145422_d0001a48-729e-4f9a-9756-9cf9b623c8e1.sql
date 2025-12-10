-- Allow admin to read all profiles
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'am1ko.ch4b1n1dze@gmail.com'
);

-- Allow admin to update profiles (for approval)
CREATE POLICY "Admin can update profiles"
ON public.profiles
FOR UPDATE
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'am1ko.ch4b1n1dze@gmail.com'
);

-- Allow admin to delete profiles (for rejection)
CREATE POLICY "Admin can delete profiles"
ON public.profiles
FOR DELETE
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'am1ko.ch4b1n1dze@gmail.com'
);