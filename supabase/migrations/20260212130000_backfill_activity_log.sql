-- ============================================================
-- Backfill activity_log with existing records as "Created" entries
-- This runs once to seed historical data. Future actions are
-- captured automatically by the log_activity() trigger.
-- ============================================================

-- Confirmations
INSERT INTO public.activity_log (table_name, record_id, action, changes, performed_by, performed_at, label)
SELECT
  'confirmations',
  c.id,
  'INSERT',
  to_jsonb(c) - 'updated_at' - 'updated_by' - 'created_at' - 'created_by',
  c.updated_by,
  COALESCE(c.created_at, now()),
  'Created confirmation ' || COALESCE(c.confirmation_code, c.id::text)
FROM public.confirmations c;

-- Transactions
INSERT INTO public.activity_log (table_name, record_id, action, changes, performed_by, performed_at, label)
SELECT
  'transactions',
  t.id,
  'INSERT',
  to_jsonb(t) - 'updated_at' - 'updated_by' - 'created_at' - 'created_by',
  COALESCE(t.updated_by, t.created_by),
  COALESCE(t.created_at, now()),
  'Created transaction ' || COALESCE(t.category, '') || ' ' || COALESCE(t.currency, '') || ' ' || COALESCE(t.amount::text, '')
FROM public.transactions t;

-- Expenses
INSERT INTO public.activity_log (table_name, record_id, action, changes, performed_by, performed_at, label)
SELECT
  'expenses',
  e.id,
  'INSERT',
  to_jsonb(e) - 'created_at' - 'created_by',
  e.created_by,
  COALESCE(e.created_at, now()),
  'Created expense ' || COALESCE(e.expense_type, '') || ' ' || COALESCE(e.amount::text, '')
FROM public.expenses e;

-- Confirmation Attachments
INSERT INTO public.activity_log (table_name, record_id, action, changes, performed_by, performed_at, label)
SELECT
  'confirmation_attachments',
  a.id,
  'INSERT',
  to_jsonb(a) - 'uploaded_at' - 'uploaded_by',
  a.uploaded_by,
  COALESCE(a.uploaded_at, now()),
  'Created attachment ' || COALESCE(a.file_name, a.id::text)
FROM public.confirmation_attachments a;
