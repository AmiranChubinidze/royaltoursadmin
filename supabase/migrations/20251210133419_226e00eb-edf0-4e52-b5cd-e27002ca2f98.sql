-- Create saved_hotels table
CREATE TABLE public.saved_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved_clients table
CREATE TABLE public.saved_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  passport_number TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_clients ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this app)
CREATE POLICY "Allow all operations for saved_hotels" 
ON public.saved_hotels 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations for saved_clients" 
ON public.saved_clients 
FOR ALL 
USING (true) 
WITH CHECK (true);