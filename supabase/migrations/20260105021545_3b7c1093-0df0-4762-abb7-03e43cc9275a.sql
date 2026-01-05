-- Add RLS policy to allow workers to view expenses (they can already see finances page)
CREATE POLICY "Worker can view expenses" 
ON public.expenses 
FOR SELECT 
USING (has_role(auth.uid(), 'worker'::app_role));