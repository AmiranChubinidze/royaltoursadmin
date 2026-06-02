-- Expense rules can belong to a group. Rules sharing the same non-null group are
-- selected/deselected together on a confirmation (e.g. the two insurance charges
-- IRAO + Eliso). "group" is a reserved word, so it is always quoted.
ALTER TABLE public.expense_rules
  ADD COLUMN IF NOT EXISTS "group" text;

-- Link the existing insurance rules so picking one selects both.
UPDATE public.expense_rules
SET "group" = 'insurance'
WHERE name ILIKE 'insurance%';
