-- Price-list PDF attachments for saved hotels (issue 6).
CREATE TABLE IF NOT EXISTS public.saved_hotel_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES public.saved_hotels(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  uploaded_at timestamp with time zone DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.saved_hotel_attachments ENABLE ROW LEVEL SECURITY;

-- Mirror saved_hotels: any authenticated user can manage hotel attachments.
DROP POLICY IF EXISTS "Authenticated users can access saved_hotel_attachments" ON public.saved_hotel_attachments;
CREATE POLICY "Authenticated users can access saved_hotel_attachments"
ON public.saved_hotel_attachments
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_saved_hotel_attachments_hotel_id
  ON public.saved_hotel_attachments(hotel_id);

-- Dedicated private storage bucket for hotel price lists.
INSERT INTO storage.buckets (id, name, public)
VALUES ('hotel-attachments', 'hotel-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can view hotel attachments" ON storage.objects;
CREATE POLICY "Authenticated can view hotel attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'hotel-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can upload hotel attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload hotel attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hotel-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete hotel attachments" ON storage.objects;
CREATE POLICY "Authenticated can delete hotel attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'hotel-attachments' AND auth.uid() IS NOT NULL);
