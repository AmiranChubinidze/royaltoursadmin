-- Create confirmations table for tour confirmation letters
CREATE TABLE public.confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confirmation_code TEXT UNIQUE NOT NULL,
  date_code TEXT NOT NULL,
  confirmation_date TEXT NOT NULL,
  main_client_name TEXT,
  tour_source TEXT,
  arrival_date TEXT,
  departure_date TEXT,
  total_days INTEGER DEFAULT 1,
  total_nights INTEGER DEFAULT 0,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;

-- Create policy for public read/write access (office staff app, no auth required for simplicity)
CREATE POLICY "Allow all operations for confirmations"
ON public.confirmations
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster queries on date_code
CREATE INDEX idx_confirmations_date_code ON public.confirmations(date_code DESC);
CREATE INDEX idx_confirmations_confirmation_code ON public.confirmations(confirmation_code);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_confirmations_updated_at
BEFORE UPDATE ON public.confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();