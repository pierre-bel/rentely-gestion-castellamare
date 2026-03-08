
-- Cleaning staff table
CREATE TABLE public.cleaning_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assignment: which cleaner handles which listing
CREATE TABLE public.cleaning_staff_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaning_staff_id UUID NOT NULL REFERENCES public.cleaning_staff(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cleaning_staff_id, listing_id)
);

-- RLS
ALTER TABLE public.cleaning_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_staff_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own cleaning staff" ON public.cleaning_staff FOR SELECT USING (auth.uid() = host_user_id);
CREATE POLICY "Hosts can insert their own cleaning staff" ON public.cleaning_staff FOR INSERT WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Hosts can update their own cleaning staff" ON public.cleaning_staff FOR UPDATE USING (auth.uid() = host_user_id);
CREATE POLICY "Hosts can delete their own cleaning staff" ON public.cleaning_staff FOR DELETE USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can view their own assignments" ON public.cleaning_staff_listings FOR SELECT USING (auth.uid() = host_user_id);
CREATE POLICY "Hosts can insert their own assignments" ON public.cleaning_staff_listings FOR INSERT WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Hosts can delete their own assignments" ON public.cleaning_staff_listings FOR DELETE USING (auth.uid() = host_user_id);
