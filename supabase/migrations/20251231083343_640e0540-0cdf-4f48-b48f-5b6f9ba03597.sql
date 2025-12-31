-- Add attachment_id to link expenses with invoice attachments
ALTER TABLE public.expenses
ADD COLUMN attachment_id uuid REFERENCES public.confirmation_attachments(id) ON DELETE SET NULL;