
-- Add host response columns to reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS host_response text,
  ADD COLUMN IF NOT EXISTS host_response_at timestamptz;

-- Allow hosts to update host_response on reviews for their listings
CREATE POLICY "Hosts can update host_response on their listing reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = reviews.listing_id
    AND l.host_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = reviews.listing_id
    AND l.host_user_id = auth.uid()
  )
);

-- Allow hosts to view reviews on their listings
CREATE POLICY "Hosts can view reviews on their listings"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = reviews.listing_id
    AND l.host_user_id = auth.uid()
  )
);

-- RPC to get host reviews with guest profile and listing info
CREATE OR REPLACE FUNCTION public.get_host_reviews(_host_user_id uuid)
RETURNS TABLE (
  id uuid,
  rating numeric,
  text text,
  status text,
  created_at timestamptz,
  host_response text,
  host_response_at timestamptz,
  listing_id uuid,
  listing_title text,
  booking_id uuid,
  author_user_id uuid,
  guest_first_name text,
  guest_last_name text,
  guest_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.rating,
    r.text,
    r.status::text,
    r.created_at,
    r.host_response,
    r.host_response_at,
    r.listing_id,
    l.title as listing_title,
    r.booking_id,
    r.author_user_id,
    p.first_name as guest_first_name,
    p.last_name as guest_last_name,
    p.avatar_url as guest_avatar_url
  FROM public.reviews r
  JOIN public.listings l ON l.id = r.listing_id
  LEFT JOIN public.profiles p ON p.id = r.author_user_id
  WHERE l.host_user_id = _host_user_id
  ORDER BY r.created_at DESC;
$$;
