-- Drop existing admin policies that reference auth.users
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;

-- Recreate policies using JWT email claim instead of auth.users query
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (
  (auth.jwt() ->> 'email') = 'am1ko.ch4b1n1dze@gmail.com'
);

CREATE POLICY "Admin can update profiles"
ON public.profiles
FOR UPDATE
USING (
  (auth.jwt() ->> 'email') = 'am1ko.ch4b1n1dze@gmail.com'
);

CREATE POLICY "Admin can delete profiles"
ON public.profiles
FOR DELETE
USING (
  (auth.jwt() ->> 'email') = 'am1ko.ch4b1n1dze@gmail.com'
);