-- Add listing_id column to reviews table for direct listing association
ALTER TABLE reviews ADD COLUMN listing_id uuid REFERENCES listings(id);

-- Populate listing_id from existing bookings
UPDATE reviews r
SET listing_id = b.listing_id
FROM bookings b
WHERE r.booking_id = b.id;

-- Make it NOT NULL after populating
ALTER TABLE reviews ALTER COLUMN listing_id SET NOT NULL;

-- Add index for performance on listing_id queries
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);

-- Create function to automatically set listing_id on review insert
CREATE OR REPLACE FUNCTION set_review_listing_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT listing_id INTO NEW.listing_id
  FROM bookings
  WHERE id = NEW.booking_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to call the function before insert
CREATE TRIGGER set_review_listing_id_trigger
BEFORE INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION set_review_listing_id();