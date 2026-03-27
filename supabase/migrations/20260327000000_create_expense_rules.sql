CREATE TABLE public.expense_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GEL',
  per_person BOOLEAN NOT NULL DEFAULT false,
  per_day BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expense_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read" ON public.expense_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "write" ON public.expense_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
