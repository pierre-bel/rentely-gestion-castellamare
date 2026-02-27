-- Create function to calculate and update listing ratings
CREATE OR REPLACE FUNCTION public.calculate_listing_rating(target_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_avg numeric;
  new_count integer;
BEGIN
  -- Calculate average rating and count from approved reviews only
  SELECT 
    COALESCE(AVG(r.rating), 0),
    COUNT(r.id)::integer
  INTO new_avg, new_count
  FROM reviews r
  INNER JOIN bookings b ON b.id = r.booking_id
  WHERE b.listing_id = target_listing_id
    AND r.status = 'approved'
    AND r.is_public = true;
  
  -- Update the listings table with calculated values
  UPDATE listings
  SET 
    rating_avg = new_avg,
    rating_count = new_count,
    updated_at = now()
  WHERE id = target_listing_id;
END;
$$;

-- Trigger function for INSERT operations
CREATE OR REPLACE FUNCTION public.update_rating_on_review_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_listing_id uuid;
BEGIN
  -- Get the listing_id from the booking
  SELECT b.listing_id INTO target_listing_id
  FROM bookings b
  WHERE b.id = NEW.booking_id;
  
  -- Recalculate rating if the new review is approved
  IF NEW.status = 'approved' AND NEW.is_public = true THEN
    PERFORM calculate_listing_rating(target_listing_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for UPDATE operations
CREATE OR REPLACE FUNCTION public.update_rating_on_review_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_listing_id uuid;
  old_counted boolean;
  new_counted boolean;
BEGIN
  -- Get the listing_id from the booking
  SELECT b.listing_id INTO target_listing_id
  FROM bookings b
  WHERE b.id = NEW.booking_id;
  
  -- Determine if review was/is counted
  old_counted := (OLD.status = 'approved' AND OLD.is_public = true);
  new_counted := (NEW.status = 'approved' AND NEW.is_public = true);
  
  -- Only recalculate if the "counted" status changed
  IF old_counted != new_counted THEN
    PERFORM calculate_listing_rating(target_listing_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for DELETE operations
CREATE OR REPLACE FUNCTION public.update_rating_on_review_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_listing_id uuid;
BEGIN
  -- Get the listing_id from the booking
  SELECT b.listing_id INTO target_listing_id
  FROM bookings b
  WHERE b.id = OLD.booking_id;
  
  -- Recalculate if the deleted review was counted
  IF OLD.status = 'approved' AND OLD.is_public = true THEN
    PERFORM calculate_listing_rating(target_listing_id);
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create triggers on the reviews table
CREATE TRIGGER trigger_update_rating_on_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_on_review_insert();

CREATE TRIGGER trigger_update_rating_on_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_on_review_update();

CREATE TRIGGER trigger_update_rating_on_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_on_review_delete();

-- Backfill existing data: recalculate ratings for all listings with reviews
DO $$
DECLARE
  listing_record record;
BEGIN
  FOR listing_record IN 
    SELECT DISTINCT b.listing_id
    FROM bookings b
    INNER JOIN reviews r ON r.booking_id = b.id
  LOOP
    PERFORM calculate_listing_rating(listing_record.listing_id);
  END LOOP;
END $$;