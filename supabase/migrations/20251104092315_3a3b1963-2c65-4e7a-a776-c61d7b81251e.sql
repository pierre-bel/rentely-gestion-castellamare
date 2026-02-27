-- Create listing_availability table for managing blocked dates and custom pricing
CREATE TABLE public.listing_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable Row Level Security
ALTER TABLE public.listing_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for listing availability
CREATE POLICY "Users can view availability for approved listings or their own"
ON public.listing_availability
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_availability.listing_id
    AND (
      listings.status = 'approved'
      OR listings.host_user_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Hosts can create availability for their own listings"
ON public.listing_availability
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_availability.listing_id
    AND (listings.host_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Hosts can update their own listing availability"
ON public.listing_availability
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_availability.listing_id
    AND (listings.host_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Hosts can delete their own listing availability"
ON public.listing_availability
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_availability.listing_id
    AND (listings.host_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_listing_availability_updated_at
BEFORE UPDATE ON public.listing_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient lookups
CREATE INDEX idx_listing_availability_listing_id ON public.listing_availability(listing_id);
CREATE INDEX idx_listing_availability_dates ON public.listing_availability(start_date, end_date);