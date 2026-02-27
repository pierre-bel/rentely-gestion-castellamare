-- Fix admin_resolve_dispute to correctly set status to "on_hold" when decision is hold
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id uuid,
  p_admin_decision text,
  p_approved_refund_amount numeric DEFAULT NULL,
  p_resolution_notes text DEFAULT NULL,
  p_is_submit boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dispute RECORD;
  v_new_status dispute_status;
  v_result json;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Validate decision
  IF p_admin_decision NOT IN ('approved', 'declined', 'on_hold', 'hold') THEN
    RETURN json_build_object('success', false, 'error', format('Invalid decision: must be approved, declined, or on_hold (got: %s)', p_admin_decision));
  END IF;

  -- Lock the dispute
  SELECT * INTO v_dispute
  FROM disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Dispute not found');
  END IF;

  -- Determine new status based on decision and submission type
  IF p_is_submit THEN
    -- When submitting, set final status
    IF p_admin_decision IN ('on_hold', 'hold') THEN
      v_new_status := 'on_hold'::dispute_status;
    ELSIF p_admin_decision = 'approved' THEN
      v_new_status := 'resolved_approved'::dispute_status;
    ELSIF p_admin_decision = 'declined' THEN
      v_new_status := 'resolved_declined'::dispute_status;
    END IF;
  ELSE
    -- When saving draft, always set to in_progress unless explicitly on_hold
    IF p_admin_decision IN ('on_hold', 'hold') THEN
      v_new_status := 'on_hold'::dispute_status;
    ELSE
      v_new_status := 'in_progress'::dispute_status;
    END IF;
  END IF;

  -- Update the dispute
  UPDATE disputes
  SET
    admin_decision = p_admin_decision,
    approved_refund_amount = COALESCE(p_approved_refund_amount, approved_refund_amount),
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    status = v_new_status,
    resolved_by_admin_id = CASE WHEN p_is_submit THEN auth.uid() ELSE resolved_by_admin_id END,
    resolved_at = CASE WHEN p_is_submit AND p_admin_decision IN ('approved', 'declined') THEN now() ELSE resolved_at END,
    updated_at = now()
  WHERE id = p_dispute_id;

  -- If approved and submitting, handle refund logic here (placeholder for future implementation)
  -- This would create payout records, transactions, etc.

  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'status', v_new_status::text,
    'decision', p_admin_decision
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;