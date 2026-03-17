
CREATE OR REPLACE FUNCTION public.merge_tenants(
  p_keep_id uuid,
  p_absorb_id uuid,
  p_merged_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id uuid;
  v_booking record;
BEGIN
  SELECT host_user_id INTO v_host_id FROM tenants WHERE id = p_keep_id;
  IF v_host_id IS NULL OR v_host_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: tenant to keep not found or not owned';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_absorb_id AND host_user_id = v_host_id) THEN
    RAISE EXCEPTION 'Unauthorized: tenant to absorb not found or not owned';
  END IF;

  FOR v_booking IN
    SELECT id, pricing_breakdown
    FROM bookings
    WHERE pricing_breakdown->>'tenant_id' = p_absorb_id::text
  LOOP
    UPDATE bookings
    SET pricing_breakdown = jsonb_set(
      v_booking.pricing_breakdown,
      '{tenant_id}',
      to_jsonb(p_keep_id::text)
    ),
    updated_at = now()
    WHERE id = v_booking.id;
  END LOOP;

  UPDATE tenants SET
    first_name = COALESCE(p_merged_data->>'first_name', first_name),
    last_name = COALESCE(p_merged_data->>'last_name', last_name),
    email = COALESCE(p_merged_data->>'email', email),
    phone = COALESCE(NULLIF(p_merged_data->>'phone', ''), phone),
    gender = COALESCE(NULLIF(p_merged_data->>'gender', ''), gender),
    street = COALESCE(NULLIF(p_merged_data->>'street', ''), street),
    street_number = COALESCE(NULLIF(p_merged_data->>'street_number', ''), street_number),
    postal_code = COALESCE(NULLIF(p_merged_data->>'postal_code', ''), postal_code),
    city = COALESCE(NULLIF(p_merged_data->>'city', ''), city),
    country = COALESCE(NULLIF(p_merged_data->>'country', ''), country),
    notes = COALESCE(NULLIF(p_merged_data->>'notes', ''), notes),
    updated_at = now()
  WHERE id = p_keep_id;

  DELETE FROM tenants WHERE id = p_absorb_id;
END;
$$;
