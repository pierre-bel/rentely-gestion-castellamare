-- Add new columns to cities table for featured destinations
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Set featured cities and add images
-- Chicago, Illinois, USA
UPDATE cities 
SET is_featured = true,
    featured_image_url = 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80'
WHERE id = '6b36aed4-5162-421d-9e52-0e78d3c9f75d';

-- Berlin, Germany
UPDATE cities 
SET is_featured = true,
    featured_image_url = 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80'
WHERE id = 'ef2fc027-b628-4cad-8f6b-fe17ee8310b1';

-- Miami, Florida, USA
UPDATE cities 
SET is_featured = true,
    featured_image_url = 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800&q=80'
WHERE id = '4f10845c-e45c-4060-aa60-c1d0bf5db833';

-- New York, New York, USA
UPDATE cities 
SET is_featured = true,
    featured_image_url = 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80'
WHERE id = '0e23815a-3e9f-4ca4-8a9b-990b17226d0b';

-- Add comments for documentation
COMMENT ON COLUMN cities.featured_image_url IS 'URL for the city image displayed in Featured Destinations section';
COMMENT ON COLUMN cities.is_featured IS 'Whether this city appears in the Featured Destinations section on homepage';