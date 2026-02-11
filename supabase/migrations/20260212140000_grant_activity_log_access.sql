-- Grant authenticated users access to the activity_log table.
-- RLS policies still control which rows they can read.
GRANT SELECT ON public.activity_log TO authenticated;
