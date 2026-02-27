-- Step 1: Drop existing RLS policy
DROP POLICY IF EXISTS "Approved reviews and own reviews are viewable" ON public.reviews;

-- Step 2: Create simplified RLS policy (only checks status)
CREATE POLICY "Approved reviews and own reviews are viewable"
ON public.reviews FOR SELECT
USING (
  (status = 'approved'::review_status) 
  OR auth.uid() = author_user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Step 3: Add admin update policy
CREATE POLICY "Admins can update review status"
ON public.reviews FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Step 4: Update calculate_listing_rating function (remove is_public check)
CREATE OR REPLACE FUNCTION public.calculate_listing_rating(target_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    AND r.status = 'approved'::review_status;
  
  -- Update the listings table with calculated values
  UPDATE listings
  SET 
    rating_avg = new_avg,
    rating_count = new_count,
    updated_at = now()
  WHERE id = target_listing_id;
END;
$function$;

-- Step 5: Update insert trigger function (remove is_public check)
CREATE OR REPLACE FUNCTION public.update_rating_on_review_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_listing_id uuid;
BEGIN
  -- Get the listing_id from the booking
  SELECT b.listing_id INTO target_listing_id
  FROM bookings b
  WHERE b.id = NEW.booking_id;
  
  -- Recalculate rating if the new review is approved
  IF NEW.status = 'approved'::review_status THEN
    PERFORM calculate_listing_rating(target_listing_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 6: Update update trigger function (simplify to only check status)
CREATE OR REPLACE FUNCTION public.update_rating_on_review_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_listing_id uuid;
  old_counted boolean;
  new_counted boolean;
BEGIN
  -- Get the listing_id from the booking
  SELECT b.listing_id INTO target_listing_id
  FROM bookings b
  WHERE b.id = NEW.booking_id;
  
  -- Determine if review was/is counted (only based on status now)
  old_counted := (OLD.status = 'approved'::review_status);
  new_counted := (NEW.status = 'approved'::review_status);
  
  -- Only recalculate if the "counted" status changed
  IF old_counted != new_counted THEN
    PERFORM calculate_listing_rating(target_listing_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 7: Update delete trigger function (remove is_public check)
CREATE OR REPLACE FUNCTION public.update_rating_on_review_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_listing_id uuid;
BEGIN
  -- Get the listing_id from the booking
  SELECT b.listing_id INTO target_listing_id
  FROM bookings b
  WHERE b.id = OLD.booking_id;
  
  -- Recalculate if the deleted review was counted
  IF OLD.status = 'approved'::review_status THEN
    PERFORM calculate_listing_rating(target_listing_id);
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Step 8: Drop and recreate admin_search_reviews function (remove is_public from return)
DROP FUNCTION IF EXISTS public.admin_search_reviews(text, review_status, text, text);

CREATE FUNCTION public.admin_search_reviews(
  search_query text DEFAULT NULL,
  status_filter review_status DEFAULT NULL,
  sort_by text DEFAULT 'created_at',
  sort_order text DEFAULT 'desc'
)
RETURNS TABLE(
  id uuid,
  booking_id uuid,
  author_user_id uuid,
  rating integer,
  text text,
  status review_status,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  guest_name text,
  guest_email text,
  guest_avatar text,
  host_name text,
  host_email text,
  listing_id uuid,
  listing_title text,
  listing_city text,
  listing_country text,
  booking_checkin date,
  booking_checkout date,
  booking_status booking_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the caller is an admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can search reviews';
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.booking_id,
    r.author_user_id,
    r.rating,
    r.text,
    r.status,
    r.created_at,
    r.updated_at,
    (guest_prof.first_name || ' ' || guest_prof.last_name) as guest_name,
    guest_prof.email as guest_email,
    guest_prof.avatar_url as guest_avatar,
    (host_prof.first_name || ' ' || host_prof.last_name) as host_name,
    host_prof.email as host_email,
    l.id as listing_id,
    l.title as listing_title,
    l.city as listing_city,
    l.country as listing_country,
    b.checkin_date as booking_checkin,
    b.checkout_date as booking_checkout,
    b.status as booking_status
  FROM reviews r
  INNER JOIN bookings b ON b.id = r.booking_id
  INNER JOIN listings l ON l.id = b.listing_id
  INNER JOIN profiles guest_prof ON guest_prof.id = r.author_user_id
  INNER JOIN profiles host_prof ON host_prof.id = l.host_user_id
  WHERE 
    (search_query IS NULL OR 
     guest_prof.first_name ILIKE '%' || search_query || '%' OR
     guest_prof.last_name ILIKE '%' || search_query || '%' OR
     guest_prof.email ILIKE '%' || search_query || '%' OR
     host_prof.first_name ILIKE '%' || search_query || '%' OR
     host_prof.last_name ILIKE '%' || search_query || '%' OR
     l.title ILIKE '%' || search_query || '%' OR
     r.text ILIKE '%' || search_query || '%')
    AND
    (status_filter IS NULL OR r.status = status_filter)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN r.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN r.created_at END ASC,
    CASE WHEN sort_by = 'rating' AND sort_order = 'desc' THEN r.rating END DESC,
    CASE WHEN sort_by = 'rating' AND sort_order = 'asc' THEN r.rating END ASC,
    r.created_at DESC;
END;
$function$;

-- Step 9: Drop the is_public column
ALTER TABLE public.reviews DROP COLUMN IF EXISTS is_public;