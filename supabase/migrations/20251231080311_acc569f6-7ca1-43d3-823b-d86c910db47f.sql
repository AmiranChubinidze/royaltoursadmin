-- Add price column to confirmations table
ALTER TABLE public.confirmations ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT NULL;

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_id UUID REFERENCES public.confirmations(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Enable RLS on expenses table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Accountant and Admin can view expenses"
ON public.expenses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can insert expenses"
ON public.expenses
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can update expenses"
ON public.expenses
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can delete expenses"
ON public.expenses
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));