-- Add new columns to disputes table for resolution tracking
ALTER TABLE disputes 
ADD COLUMN IF NOT EXISTS approved_refund_amount NUMERIC,
ADD COLUMN IF NOT EXISTS admin_decision TEXT CHECK (admin_decision IN ('approved', 'declined', 'on_hold')),
ADD COLUMN IF NOT EXISTS resolved_by_admin_id UUID REFERENCES profiles(id);

-- Create function to fetch comprehensive dispute details for admin
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
      'display_id', b.display_id,
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
      'cancellation_policy_snapshot', b.cancellation_policy_snapshot,
      'payment_method', b.payment_method
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

-- Create function to save or submit dispute resolution
CREATE OR REPLACE FUNCTION admin_resolve_dispute(
  p_dispute_id UUID,
  p_admin_decision TEXT,
  p_approved_refund_amount NUMERIC,
  p_resolution_notes TEXT,
  p_is_submit BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
  v_dispute RECORD;
BEGIN
  -- Check admin access
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Lock dispute row
  SELECT * INTO v_dispute
  FROM disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;

  -- Update dispute record
  IF p_is_submit THEN
    -- Submit: mark as resolved with final status
    UPDATE disputes
    SET
      admin_decision = p_admin_decision,
      approved_refund_amount = p_approved_refund_amount,
      resolution_notes = p_resolution_notes,
      status = CASE
        WHEN p_admin_decision = 'approved' THEN 'resolved_approved'::dispute_status
        WHEN p_admin_decision = 'declined' THEN 'resolved_declined'::dispute_status
        WHEN p_admin_decision = 'on_hold' THEN 'in_progress'::dispute_status
      END,
      resolved_at = CASE WHEN p_admin_decision IN ('approved', 'declined') THEN NOW() ELSE NULL END,
      resolved_by_admin_id = auth.uid(),
      assigned_admin_id = COALESCE(assigned_admin_id, auth.uid()),
      updated_at = NOW()
    WHERE id = p_dispute_id;
  ELSE
    -- Save: update fields but don't change status
    UPDATE disputes
    SET
      admin_decision = p_admin_decision,
      approved_refund_amount = p_approved_refund_amount,
      resolution_notes = p_resolution_notes,
      assigned_admin_id = COALESCE(assigned_admin_id, auth.uid()),
      updated_at = NOW()
    WHERE id = p_dispute_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'action', CASE WHEN p_is_submit THEN 'submitted' ELSE 'saved' END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';