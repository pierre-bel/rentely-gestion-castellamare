-- Remove latitude and longitude columns from cities table
ALTER TABLE public.cities 
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_cities_lat_long;