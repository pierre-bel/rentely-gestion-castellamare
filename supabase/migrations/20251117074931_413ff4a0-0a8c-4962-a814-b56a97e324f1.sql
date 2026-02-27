-- Add latitude and longitude columns to cities table for geocoding
ALTER TABLE public.cities 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Add indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_cities_lat_long ON public.cities (latitude, longitude);