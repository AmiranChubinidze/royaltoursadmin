-- Add worker role access to transactions table
CREATE POLICY "Worker can view transactions" 
ON public.transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'worker'::app_role));

CREATE POLICY "Worker can insert transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'worker'::app_role));

CREATE POLICY "Worker can update transactions" 
ON public.transactions 
FOR UPDATE 
USING (has_role(auth.uid(), 'worker'::app_role));

CREATE POLICY "Worker can delete transactions" 
ON public.transactions 
FOR DELETE 
USING (has_role(auth.uid(), 'worker'::app_role));

-- Add worker role INSERT/UPDATE/DELETE access to expenses table (already has SELECT)
CREATE POLICY "Worker can insert expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'worker'::app_role));

CREATE POLICY "Worker can update expenses" 
ON public.expenses 
FOR UPDATE 
USING (has_role(auth.uid(), 'worker'::app_role));

CREATE POLICY "Worker can delete expenses" 
ON public.expenses 
FOR DELETE 
USING (has_role(auth.uid(), 'worker'::app_role));