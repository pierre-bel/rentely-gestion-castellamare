ALTER TABLE public.cleaning_staff
  ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS all_listings boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_tenant_names boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_cleaning_portal_data(p_token text, p_month_start date, p_month_end date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff RECORD;
  v_result JSON;
BEGIN
  SELECT cs.id, cs.name, cs.host_user_id, cs.portal_past_months, cs.portal_future_months,
         cs.all_listings, cs.show_tenant_names, cs.is_active
  INTO v_staff
  FROM cleaning_staff cs
  WHERE cs.access_token = p_token;

  IF v_staff IS NULL OR NOT v_staff.is_active THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'staff_name', v_staff.name,
    'portal_past_months', v_staff.portal_past_months,
    'portal_future_months', v_staff.portal_future_months,
    'listings', (
      SELECT COALESCE(json_agg(listing_data ORDER BY listing_data.title), '[]'::json)
      FROM (
        SELECT
          l.id, l.title, l.checkin_from, l.checkout_until,
          (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', b.id,
                'checkin_date', b.checkin_date,
                'checkout_date', b.checkout_date,
                'nights', b.nights,
                'status', b.status,
                'checkin_time', b.checkin_time,
                'checkout_time', b.checkout_time,
                'tenant_name', CASE
                  WHEN b.status = 'owner_blocked' THEN
                    CASE WHEN v_staff.show_tenant_names
                      THEN COALESCE(NULLIF(split_part(b.notes, ' | ', 1), ''), 'Bloqué')
                      ELSE 'Bloqué' END
                  WHEN NOT v_staff.show_tenant_names THEN 'Locataire'
                  ELSE COALESCE(
                    (SELECT t.first_name || COALESCE(' ' || t.last_name, '')
                     FROM tenants t WHERE t.id = (b.pricing_breakdown->>'tenant_id')::uuid),
                    'Locataire')
                END,
                'tenant_phone', CASE
                  WHEN b.status = 'owner_blocked' OR NOT v_staff.show_tenant_names THEN NULL
                  ELSE (SELECT t.phone FROM tenants t WHERE t.id = (b.pricing_breakdown->>'tenant_id')::uuid)
                END
              ) ORDER BY b.checkin_date
            ), '[]'::json)
            FROM bookings b
            WHERE b.listing_id = l.id
              AND b.status IN ('confirmed', 'completed', 'owner_blocked')
              AND b.checkout_date >= (p_month_start - INTERVAL '7 days')::date
              AND b.checkin_date <= (p_month_end + INTERVAL '7 days')::date
          ) AS bookings
        FROM listings l
        WHERE (v_staff.all_listings AND l.host_user_id = v_staff.host_user_id)
           OR (NOT v_staff.all_listings AND EXISTS (
                SELECT 1 FROM cleaning_staff_listings csl
                WHERE csl.listing_id = l.id AND csl.cleaning_staff_id = v_staff.id))
      ) listing_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;