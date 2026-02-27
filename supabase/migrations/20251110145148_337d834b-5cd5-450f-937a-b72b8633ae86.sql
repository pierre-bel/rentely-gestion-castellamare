-- Fix admin_get_dispute_details function - remove non-existent display_id column
DROP FUNCTION IF EXISTS admin_get_dispute_details(UUID);

CREATE OR REPLACE FUNCTION admin_get_dispute_details(p_dispute_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check admin access
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT json_build_object(
    'dispute', row_to_json(d.*),
    'booking', json_build_object(
      'id', b.id,
      'checkin_date', b.checkin_date,
      'checkout_date', b.checkout_date,
      'nights', b.nights,
      'guests', b.guests,
      'total_price', b.total_price,
      'subtotal', b.subtotal,
      'cleaning_fee', b.cleaning_fee,
      'service_fee', b.service_fee,
      'taxes', b.taxes,
      'status', b.status,
      'currency', b.currency,
      'cancellation_policy_snapshot', b.cancellation_policy_snapshot
    ),
    'listing', json_build_object(
      'id', l.id,
      'title', l.title,
      'city', l.city,
      'state', l.state,
      'country', l.country,
      'address', l.address,
      'cover_image', l.cover_image
    ),
    'guest', json_build_object(
      'id', guest_p.id,
      'name', CONCAT(guest_p.first_name, ' ', guest_p.last_name),
      'email', guest_p.email,
      'avatar_url', guest_p.avatar_url
    ),
    'host', json_build_object(
      'id', host_p.id,
      'name', CONCAT(host_p.first_name, ' ', host_p.last_name),
      'email', host_p.email,
      'avatar_url', host_p.avatar_url
    )
  ) INTO v_result
  FROM disputes d
  INNER JOIN bookings b ON b.id = d.booking_id
  INNER JOIN listings l ON l.id = d.listing_id
  INNER JOIN profiles guest_p ON guest_p.id = b.guest_user_id
  INNER JOIN profiles host_p ON host_p.id = l.host_user_id
  WHERE d.id = p_dispute_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';