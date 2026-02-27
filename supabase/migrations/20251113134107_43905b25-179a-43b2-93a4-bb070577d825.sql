-- Create RPC function for host listings search with filters and sorting
CREATE OR REPLACE FUNCTION public.host_search_listings(
  host_id uuid,
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
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the user is a host or admin
  IF NOT (has_role(host_id, 'host') OR has_role(host_id, 'admin')) THEN
    RAISE EXCEPTION 'User must be a host or admin';
  END IF;

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
    l.updated_at
  FROM listings l
  WHERE l.host_user_id = host_id
    -- Search filter (title, city, state, country, address, type)
    AND (
      search_query IS NULL 
      OR l.title ILIKE '%' || search_query || '%'
      OR l.city ILIKE '%' || search_query || '%'
      OR l.state ILIKE '%' || search_query || '%'
      OR l.country ILIKE '%' || search_query || '%'
      OR l.address ILIKE '%' || search_query || '%'
      OR l.type::text ILIKE '%' || search_query || '%'
    )
    -- Status filter
    AND (status_filter IS NULL OR l.status = status_filter)
    -- Price range filter
    AND (min_price IS NULL OR l.base_price >= min_price)
    AND (max_price IS NULL OR l.base_price <= max_price)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN l.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN l.created_at END ASC,
    CASE WHEN sort_by = 'updated_at' AND sort_order = 'desc' THEN l.updated_at END DESC,
    CASE WHEN sort_by = 'updated_at' AND sort_order = 'asc' THEN l.updated_at END ASC,
    CASE WHEN sort_by = 'base_price' AND sort_order = 'desc' THEN l.base_price END DESC,
    CASE WHEN sort_by = 'base_price' AND sort_order = 'asc' THEN l.base_price END ASC,
    CASE WHEN sort_by = 'rating_avg' AND sort_order = 'desc' THEN l.rating_avg END DESC,
    CASE WHEN sort_by = 'rating_avg' AND sort_order = 'asc' THEN l.rating_avg END ASC,
    l.created_at DESC;
END;
$$;

-- Create index for better performance on host listings queries
CREATE INDEX IF NOT EXISTS idx_listings_host_status ON listings(host_user_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_base_price ON listings(base_price);
CREATE INDEX IF NOT EXISTS idx_listings_rating_avg ON listings(rating_avg);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.host_search_listings TO authenticated;