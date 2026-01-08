
-- Create holders table (where money physically sits)
CREATE TABLE public.holders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('cash', 'bank', 'card')),
  currency text NOT NULL DEFAULT 'GEL' CHECK (currency IN ('GEL', 'USD')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create owners table (who is accountable)
CREATE TABLE public.owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  role text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create liabilities table (company owes person)
CREATE TABLE public.liabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.owners(id) NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GEL' CHECK (currency IN ('GEL', 'USD')),
  reason text,
  source_transaction_id uuid,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_transaction_id uuid
);

-- Add new columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'void')),
ADD COLUMN IF NOT EXISTS kind text CHECK (kind IN ('in', 'out', 'transfer')),
ADD COLUMN IF NOT EXISTS holder_id uuid REFERENCES public.holders(id),
ADD COLUMN IF NOT EXISTS from_holder_id uuid REFERENCES public.holders(id),
ADD COLUMN IF NOT EXISTS to_holder_id uuid REFERENCES public.holders(id),
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.owners(id),
ADD COLUMN IF NOT EXISTS counterparty text;

-- Enable RLS on new tables
ALTER TABLE public.holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

-- Holders RLS policies
CREATE POLICY "Accountant and Admin can view holders" ON public.holders
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can insert holders" ON public.holders
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can update holders" ON public.holders
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can delete holders" ON public.holders
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Worker can view holders" ON public.holders
FOR SELECT USING (has_role(auth.uid(), 'worker'::app_role));

-- Owners RLS policies
CREATE POLICY "Accountant and Admin can view owners" ON public.owners
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can insert owners" ON public.owners
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can update owners" ON public.owners
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can delete owners" ON public.owners
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Worker can view owners" ON public.owners
FOR SELECT USING (has_role(auth.uid(), 'worker'::app_role));

-- Liabilities RLS policies
CREATE POLICY "Accountant and Admin can view liabilities" ON public.liabilities
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can insert liabilities" ON public.liabilities
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can update liabilities" ON public.liabilities
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountant and Admin can delete liabilities" ON public.liabilities
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Worker can view liabilities" ON public.liabilities
FOR SELECT USING (has_role(auth.uid(), 'worker'::app_role));

-- Seed initial holders
INSERT INTO public.holders (name, type, currency) VALUES
  ('Rezi Cash', 'cash', 'GEL'),
  ('Mom Cash', 'cash', 'GEL'),
  ('Office Cash', 'cash', 'GEL'),
  ('TBC Bank', 'bank', 'GEL'),
  ('BOG Bank', 'bank', 'GEL'),
  ('Company Card', 'card', 'GEL');

-- Seed initial owners
INSERT INTO public.owners (name, role) VALUES
  ('Rezi', 'manager'),
  ('Mom', 'manager'),
  ('Nato', 'staff'),
  ('Samira', 'staff'),
  ('Company', 'company');

-- Migrate existing transactions: set kind based on type
UPDATE public.transactions 
SET kind = CASE 
  WHEN type = 'income' THEN 'in'
  WHEN type = 'expense' THEN 'out'
  ELSE 'out'
END
WHERE kind IS NULL;

-- Migrate is_paid to status (for existing transactions that have is_paid)
UPDATE public.transactions 
SET status = CASE 
  WHEN is_paid = true THEN 'confirmed'
  ELSE 'pending'
END;

-- Make kind NOT NULL after migration
ALTER TABLE public.transactions ALTER COLUMN kind SET NOT NULL;

-- Add foreign key for liabilities source_transaction_id
ALTER TABLE public.liabilities 
ADD CONSTRAINT liabilities_source_transaction_fk 
FOREIGN KEY (source_transaction_id) REFERENCES public.transactions(id);

ALTER TABLE public.liabilities 
ADD CONSTRAINT liabilities_resolved_transaction_fk 
FOREIGN KEY (resolved_transaction_id) REFERENCES public.transactions(id);
