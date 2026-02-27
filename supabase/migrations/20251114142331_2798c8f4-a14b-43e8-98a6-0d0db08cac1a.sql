-- Create admin listings search RPC function
-- This function allows admins to search, filter, and sort all listings
CREATE OR REPLACE FUNCTION public.admin_search_listings(
  search_query text DEFAULT NULL,
  status_filter listing_status DEFAULT NULL,
  min_price numeric DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  sort_by text DEFAULT 'created_at',
  sort_order text DEFAULT 'desc'
)
RETURNS TABLE(
  id uuid,
  title text,
  status listing_status,
  type property_type,
  city text,
  state text,
  country text,
  base_price numeric,
  cover_image text,
  rating_avg numeric,
  rating_count integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  host_user_id uuid,
  host_first_name text,
  host_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can search all listings';
  END IF;

  -- Return filtered and sorted listings with host information
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.status,
    l.type,
    l.city,
    l.state,
    l.country,
    l.base_price,
    l.cover_image,
    l.rating_avg,
    l.rating_count,
    l.created_at,
    l.updated_at,
    l.host_user_id,
    p.first_name as host_first_name,
    p.last_name as host_last_name
  FROM listings l
  LEFT JOIN profiles p ON p.id = l.host_user_id
  WHERE 
    -- Search filter: search across multiple fields including host name
    (search_query IS NULL OR (
      l.title ILIKE '%' || search_query || '%' OR
      l.city ILIKE '%' || search_query || '%' OR
      l.state ILIKE '%' || search_query || '%' OR
      l.country ILIKE '%' || search_query || '%' OR
      l.address ILIKE '%' || search_query || '%' OR
      l.type::text ILIKE '%' || search_query || '%' OR
      p.first_name ILIKE '%' || search_query || '%' OR
      p.last_name ILIKE '%' || search_query || '%' OR
      (p.first_name || ' ' || p.last_name) ILIKE '%' || search_query || '%'
    ))
    -- Status filter
    AND (status_filter IS NULL OR l.status = status_filter)
    -- Price range filters
    AND (min_price IS NULL OR l.base_price >= min_price)
    AND (max_price IS NULL OR l.base_price <= max_price)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN l.created_at END ASC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN l.created_at END DESC,
    CASE WHEN sort_by = 'updated_at' AND sort_order = 'asc' THEN l.updated_at END ASC,
    CASE WHEN sort_by = 'updated_at' AND sort_order = 'desc' THEN l.updated_at END DESC,
    CASE WHEN sort_by = 'base_price' AND sort_order = 'asc' THEN l.base_price END ASC,
    CASE WHEN sort_by = 'base_price' AND sort_order = 'desc' THEN l.base_price END DESC,
    CASE WHEN sort_by = 'rating_avg' AND sort_order = 'asc' THEN l.rating_avg END ASC,
    CASE WHEN sort_by = 'rating_avg' AND sort_order = 'desc' THEN l.rating_avg END DESC;
END;
$$;