
-- Add access_token to cleaning_staff for public portal access
ALTER TABLE public.cleaning_staff 
ADD COLUMN access_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex');

-- Create unique index on access_token
CREATE UNIQUE INDEX idx_cleaning_staff_access_token ON public.cleaning_staff(access_token);

-- Create a function to get cleaning portal data by staff token (no auth required)
CREATE OR REPLACE FUNCTION public.get_cleaning_portal_data(p_token TEXT, p_month_start DATE, p_month_end DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff RECORD;
  v_result JSON;
BEGIN
  -- Find the staff member by token
  SELECT cs.id, cs.name, cs.host_user_id
  INTO v_staff
  FROM cleaning_staff cs
  WHERE cs.access_token = p_token;

  IF v_staff IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'staff_name', v_staff.name,
    'listings', (
      SELECT COALESCE(json_agg(listing_data ORDER BY listing_data.title), '[]'::json)
      FROM (
        SELECT
          l.id,
          l.title,
          l.checkin_from,
          l.checkout_until,
          (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', b.id,
                'checkin_date', b.checkin_date,
                'checkout_date', b.checkout_date,
                'nights', b.nights,
                'status', b.status,
                'tenant_name', COALESCE(
                  (SELECT t.first_name || COALESCE(' ' || t.last_name, '')
                   FROM tenants t 
                   WHERE t.id = (b.pricing_breakdown->>'tenant_id')::uuid),
                  COALESCE(b.notes, 'Non renseigné')
                ),
                'tenant_phone', (
                  SELECT t.phone
                  FROM tenants t 
                  WHERE t.id = (b.pricing_breakdown->>'tenant_id')::uuid
                )
              ) ORDER BY b.checkin_date
            ), '[]'::json)
            FROM bookings b
            WHERE b.listing_id = l.id
              AND b.status IN ('confirmed', 'completed')
              AND b.checkout_date >= (p_month_start - INTERVAL '7 days')::date
              AND b.checkin_date <= (p_month_end + INTERVAL '7 days')::date
          ) AS bookings
        FROM listings l
        INNER JOIN cleaning_staff_listings csl ON csl.listing_id = l.id
        WHERE csl.cleaning_staff_id = v_staff.id
        ORDER BY l.title
      ) listing_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
