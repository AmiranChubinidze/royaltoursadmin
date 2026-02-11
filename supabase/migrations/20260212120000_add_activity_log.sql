-- ============================================================
-- Activity Log: captures every INSERT / UPDATE / DELETE on key tables
-- ============================================================

CREATE TABLE public.activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT NOT NULL,
  record_id     UUID NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changes       JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_by  UUID,
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  label         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_activity_log_performed_at ON public.activity_log (performed_at DESC);
CREATE INDEX idx_activity_log_table_name   ON public.activity_log (table_name);
CREATE INDEX idx_activity_log_performed_by ON public.activity_log (performed_by);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Worker can view activity_log"
ON public.activity_log
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'worker'::app_role)
);

-- ============================================================
-- Generic trigger function: logs field-level diffs on UPDATE,
-- full snapshots on INSERT/DELETE
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _changes    JSONB := '{}'::jsonb;
  _label      TEXT  := '';
  _record_id  UUID;
  _old_json   JSONB;
  _new_json   JSONB;
  _key        TEXT;
  _skip_keys  TEXT[] := ARRAY[
    'updated_at', 'updated_by', 'created_at', 'created_by'
  ];
  _old_val    JSONB;
  _new_val    JSONB;
  _has_diff   BOOLEAN := FALSE;
BEGIN

  -- Determine record_id
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id;
  ELSE
    _record_id := NEW.id;
  END IF;

  -- Build changes payload
  IF TG_OP = 'INSERT' THEN
    _changes := to_jsonb(NEW);
    _changes := _changes - 'updated_at' - 'updated_by' - 'created_at' - 'created_by';

  ELSIF TG_OP = 'DELETE' THEN
    _changes := to_jsonb(OLD);
    _changes := _changes - 'updated_at' - 'updated_by' - 'created_at' - 'created_by';

  ELSIF TG_OP = 'UPDATE' THEN
    _old_json := to_jsonb(OLD);
    _new_json := to_jsonb(NEW);

    FOR _key IN SELECT jsonb_object_keys(_new_json)
    LOOP
      IF _key = ANY(_skip_keys) THEN
        CONTINUE;
      END IF;

      _old_val := _old_json -> _key;
      _new_val := _new_json -> _key;

      IF (_old_val IS DISTINCT FROM _new_val) THEN
        _changes := _changes || jsonb_build_object(
          _key, jsonb_build_object('old', _old_val, 'new', _new_val)
        );
        _has_diff := TRUE;
      END IF;
    END LOOP;

    -- Skip logging if no real fields changed
    IF NOT _has_diff THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Build human-readable label
  _label := CASE TG_OP
    WHEN 'INSERT' THEN 'Created'
    WHEN 'UPDATE' THEN 'Updated'
    WHEN 'DELETE' THEN 'Deleted'
  END || ' ';

  CASE TG_TABLE_NAME
    WHEN 'confirmations' THEN
      IF TG_OP = 'DELETE' THEN
        _label := _label || 'confirmation ' || COALESCE(OLD.confirmation_code, OLD.id::text);
      ELSE
        _label := _label || 'confirmation ' || COALESCE(NEW.confirmation_code, NEW.id::text);
      END IF;

    WHEN 'transactions' THEN
      IF TG_OP = 'DELETE' THEN
        _label := _label || 'transaction ' || COALESCE(OLD.category, '') || ' ' || COALESCE(OLD.currency, '') || ' ' || COALESCE(OLD.amount::text, '');
      ELSE
        _label := _label || 'transaction ' || COALESCE(NEW.category, '') || ' ' || COALESCE(NEW.currency, '') || ' ' || COALESCE(NEW.amount::text, '');
      END IF;

    WHEN 'expenses' THEN
      IF TG_OP = 'DELETE' THEN
        _label := _label || 'expense ' || COALESCE(OLD.expense_type, '') || ' ' || COALESCE(OLD.amount::text, '');
      ELSE
        _label := _label || 'expense ' || COALESCE(NEW.expense_type, '') || ' ' || COALESCE(NEW.amount::text, '');
      END IF;

    WHEN 'confirmation_attachments' THEN
      IF TG_OP = 'DELETE' THEN
        _label := _label || 'attachment ' || COALESCE(OLD.file_name, OLD.id::text);
      ELSE
        _label := _label || 'attachment ' || COALESCE(NEW.file_name, NEW.id::text);
      END IF;

    ELSE
      _label := _label || TG_TABLE_NAME || ' ' || _record_id::text;
  END CASE;

  -- Insert log row
  INSERT INTO public.activity_log (table_name, record_id, action, changes, performed_by, performed_at, label)
  VALUES (TG_TABLE_NAME, _record_id, TG_OP, _changes, auth.uid(), now(), _label);

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- ============================================================
-- Attach triggers (AFTER so other BEFORE triggers have run)
-- ============================================================

DROP TRIGGER IF EXISTS trg_log_activity_confirmations ON public.confirmations;
CREATE TRIGGER trg_log_activity_confirmations
AFTER INSERT OR UPDATE OR DELETE ON public.confirmations
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_activity_transactions ON public.transactions;
CREATE TRIGGER trg_log_activity_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_activity_expenses ON public.expenses;
CREATE TRIGGER trg_log_activity_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_activity_attachments ON public.confirmation_attachments;
CREATE TRIGGER trg_log_activity_attachments
AFTER INSERT OR UPDATE OR DELETE ON public.confirmation_attachments
FOR EACH ROW EXECUTE FUNCTION public.log_activity();
