-- ============================================================================
-- PHASE 1: Database Schema - Guest Debts Table and Enhanced Dispute Resolution
-- ============================================================================

-- Create guest_debts table to track money owed by guests to the platform
CREATE TABLE IF NOT EXISTS public.guest_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_user_id UUID NOT NULL REFERENCES auth.users(id),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'paid', 'waived', 'expired')),
  reason TEXT NOT NULL, -- 'property_damage', 'cleaning_fee', 'cancellation_fee', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  waived_at TIMESTAMP WITH TIME ZONE,
  waived_by_admin_id UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '180 days'), -- 6 months default
  payment_transaction_id UUID REFERENCES public.transactions(id),
  notes TEXT
);

-- Add index for fast lookups by guest
CREATE INDEX IF NOT EXISTS idx_guest_debts_guest_user_id ON public.guest_debts(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_guest_debts_status ON public.guest_debts(status);
CREATE INDEX IF NOT EXISTS idx_guest_debts_dispute_id ON public.guest_debts(dispute_id);

-- Add dispute_id to transactions table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'dispute_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN dispute_id UUID REFERENCES public.disputes(id);
    CREATE INDEX idx_transactions_dispute_id ON public.transactions(dispute_id);
  END IF;
END $$;

-- Update payout status to support new state
-- The payouts.status column is already TEXT, so we just need to use the new value

-- ============================================================================
-- PHASE 2: Core Functions - Dispute Resolution Logic
-- ============================================================================

-- Function: Check if guest has outstanding debts (used for booking restrictions)
CREATE OR REPLACE FUNCTION public.check_guest_outstanding_debts(p_guest_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.guest_debts 
    WHERE guest_user_id = p_guest_user_id 
      AND status = 'outstanding'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;

-- Function: Get eligible refund amount for a booking (already exists, but ensuring it's correct)
CREATE OR REPLACE FUNCTION public.get_eligible_refund_amount(p_booking_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_price NUMERIC;
  v_total_refunded NUMERIC;
BEGIN
  -- Get booking total price
  SELECT total_price INTO v_total_price
  FROM public.bookings
  WHERE id = p_booking_id;
  
  IF v_total_price IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Calculate total already refunded (from approved disputes)
  SELECT COALESCE(SUM(d.approved_refund_amount), 0) INTO v_total_refunded
  FROM public.disputes d
  WHERE d.booking_id = p_booking_id
    AND d.status IN ('resolved_approved', 'resolved_approved')
    AND d.approved_refund_amount IS NOT NULL;
  
  RETURN GREATEST(v_total_price - v_total_refunded, 0);
END;
$$;

-- Function: Send dispute resolution message to support thread
CREATE OR REPLACE FUNCTION public.send_dispute_resolution_message(
  p_dispute_id UUID,
  p_decision TEXT,
  p_refund_amount NUMERIC DEFAULT NULL,
  p_resolution_notes TEXT DEFAULT NULL,
  p_is_guest_dispute BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
  v_support_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_message_body TEXT;
  v_user_id UUID;
BEGIN
  -- Get dispute details
  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  
  -- Determine recipient (the user who initiated the dispute)
  v_user_id := v_dispute.initiated_by_user_id;
  
  -- Build message based on decision and dispute type
  IF p_decision = 'approved' THEN
    IF p_is_guest_dispute THEN
      v_message_body := format(
        E'Your dispute has been resolved in your favor.\n\n' ||
        E'Decision: Approved\n' ||
        E'Refund Amount: $%s %s\n\n' ||
        CASE WHEN p_resolution_notes IS NOT NULL 
          THEN format(E'Resolution Notes:\n%s\n\n', p_resolution_notes)
          ELSE ''
        END ||
        E'The refund will be processed to your original payment method within 5-7 business days.\n\n' ||
        E'This thread is now closed. Thank you for your patience.',
        p_refund_amount::TEXT,
        v_dispute_booking_id::TEXT
      );
    ELSE
      -- Host dispute approved
      v_message_body := format(
        E'Your dispute has been resolved in your favor.\n\n' ||
        E'Decision: Approved\n' ||
        E'Claim Amount: $%s\n\n' ||
        CASE WHEN p_resolution_notes IS NOT NULL 
          THEN format(E'Resolution Notes:\n%s\n\n', p_resolution_notes)
          ELSE ''
        END ||
        E'A debt record has been created for the guest. You will receive payment once the guest settles their debt.\n\n' ||
        E'This thread is now closed. Thank you for your patience.',
        p_refund_amount::TEXT
      );
    END IF;
  ELSIF p_decision = 'declined' THEN
    v_message_body := format(
      E'Your dispute has been reviewed and declined.\n\n' ||
      E'Decision: Declined\n\n' ||
      CASE WHEN p_resolution_notes IS NOT NULL 
        THEN format(E'Reason:\n%s\n\n', p_resolution_notes)
        ELSE ''
      END ||
      E'This thread is now closed. If you have additional questions, please contact support.',
      v_dispute.booking_id::TEXT
    );
  ELSE
    -- On hold
    v_message_body := format(
      E'Your dispute is currently on hold.\n\n' ||
      E'Status: On Hold\n\n' ||
      CASE WHEN p_resolution_notes IS NOT NULL 
        THEN format(E'Notes:\n%s\n\n', p_resolution_notes)
        ELSE ''
      END ||
      E'We will update you as soon as we have more information.'
    );
  END IF;
  
  -- Insert message if thread exists
  IF v_dispute.support_thread_id IS NOT NULL THEN
    INSERT INTO public.messages (
      thread_id,
      from_user_id,
      to_user_id,
      body,
      read
    ) VALUES (
      v_dispute.support_thread_id,
      v_support_user_id,
      v_user_id,
      v_message_body,
      false
    );
    
    -- Lock thread if decision is final (approved or declined)
    IF p_decision IN ('approved', 'declined') THEN
      UPDATE public.message_threads
      SET 
        is_locked = true,
        locked_at = NOW(),
        locked_reason = format('Dispute %s - Resolution: %s', p_dispute_id::TEXT, p_decision),
        updated_at = NOW()
      WHERE id = v_dispute.support_thread_id;
    END IF;
  END IF;
END;
$$;

-- Function: Process guest refund (when guest initiates dispute)
CREATE OR REPLACE FUNCTION public.process_guest_refund(
  p_dispute_id UUID,
  p_approved_refund_amount NUMERIC,
  p_resolution_notes TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_eligible_refund NUMERIC;
  v_payout RECORD;
  v_refund_transaction_id UUID;
  v_remaining_payout NUMERIC;
BEGIN
  -- Lock and get dispute
  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  
  -- Get booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_dispute.booking_id;
  
  -- Validate refund amount
  v_eligible_refund := get_eligible_refund_amount(v_dispute.booking_id);
  
  IF p_approved_refund_amount > v_eligible_refund THEN
    RAISE EXCEPTION 'Refund amount ($%) exceeds eligible refund amount ($%)', 
      p_approved_refund_amount, v_eligible_refund;
  END IF;
  
  -- Create refund transaction for guest
  INSERT INTO public.transactions (
    booking_id,
    type,
    amount,
    currency,
    provider,
    status,
    dispute_id
  ) VALUES (
    v_dispute.booking_id,
    'refund',
    p_approved_refund_amount,
    v_booking.currency,
    'stripe',
    'succeeded',
    p_dispute_id
  ) RETURNING id INTO v_refund_transaction_id;
  
  -- Check if host payout exists and its status
  SELECT * INTO v_payout
  FROM public.payouts
  WHERE booking_id = v_dispute.booking_id
    AND host_user_id = (SELECT host_user_id FROM public.listings WHERE id = v_booking.listing_id)
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_payout.id IS NOT NULL THEN
    IF v_payout.status = 'pending' THEN
      -- Scenario A: Payout is pending, reduce or cancel it
      v_remaining_payout := v_payout.amount - p_approved_refund_amount;
      
      IF v_remaining_payout <= 0 THEN
        -- Cancel payout entirely
        UPDATE public.payouts
        SET 
          status = 'cancelled',
          notes = format('Cancelled due to approved dispute refund of $%s. Original amount: $%s',
            p_approved_refund_amount::TEXT, v_payout.amount::TEXT),
          updated_at = NOW()
        WHERE id = v_payout.id;
      ELSE
        -- Reduce payout amount
        UPDATE public.payouts
        SET 
          amount = v_remaining_payout,
          notes = format('Reduced by $%s due to approved dispute refund. Original amount: $%s',
            p_approved_refund_amount::TEXT, v_payout.amount::TEXT),
          updated_at = NOW()
        WHERE id = v_payout.id;
      END IF;
      
    ELSIF v_payout.status = 'completed' THEN
      -- Scenario B: Payout already completed, create debt record for host
      INSERT INTO public.payouts (
        host_user_id,
        booking_id,
        amount,
        currency,
        status,
        notes,
        dispute_id
      ) VALUES (
        v_payout.host_user_id,
        v_dispute.booking_id,
        -p_approved_refund_amount, -- Negative amount = debt
        v_booking.currency,
        'debit',
        format('Host owes $%s due to approved guest dispute refund. Original payout (ID: %s) was already completed on %s',
          p_approved_refund_amount::TEXT, v_payout.id::TEXT, v_payout.payout_date::TEXT),
        p_dispute_id
      );
    END IF;
  END IF;
  
  -- Update dispute to resolved_approved
  UPDATE public.disputes
  SET 
    status = 'resolved_approved',
    admin_decision = 'approved',
    approved_refund_amount = p_approved_refund_amount,
    resolution_notes = p_resolution_notes,
    resolved_by_admin_id = auth.uid(),
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_dispute_id;
  
  -- Send resolution message
  PERFORM send_dispute_resolution_message(
    p_dispute_id,
    'approved',
    p_approved_refund_amount,
    p_resolution_notes,
    TRUE -- is_guest_dispute
  );
  
  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'refund_transaction_id', v_refund_transaction_id,
    'refund_amount', p_approved_refund_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Process host claim (when host initiates dispute)
CREATE OR REPLACE FUNCTION public.process_host_claim(
  p_dispute_id UUID,
  p_approved_claim_amount NUMERIC,
  p_resolution_notes TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_listing RECORD;
  v_guest_debt_id UUID;
  v_host_payout_id UUID;
BEGIN
  -- Lock and get dispute
  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  
  -- Get booking and listing details
  SELECT * INTO v_booking FROM public.bookings WHERE id = v_dispute.booking_id;
  SELECT * INTO v_listing FROM public.listings WHERE id = v_dispute.listing_id;
  
  -- Create guest debt record
  INSERT INTO public.guest_debts (
    guest_user_id,
    dispute_id,
    booking_id,
    amount,
    currency,
    status,
    reason,
    notes
  ) VALUES (
    v_booking.guest_user_id,
    p_dispute_id,
    v_dispute.booking_id,
    p_approved_claim_amount,
    v_booking.currency,
    'outstanding',
    v_dispute.category::TEXT,
    p_resolution_notes
  ) RETURNING id INTO v_guest_debt_id;
  
  -- Create pending host payout (will be activated when guest pays)
  INSERT INTO public.payouts (
    host_user_id,
    booking_id,
    amount,
    currency,
    status,
    notes,
    dispute_id
  ) VALUES (
    v_listing.host_user_id,
    v_dispute.booking_id,
    p_approved_claim_amount,
    v_booking.currency,
    'pending_guest_payment',
    format('Awaiting guest debt payment. Guest debt ID: %s. Will be processed once guest pays their outstanding debt.',
      v_guest_debt_id::TEXT),
    p_dispute_id
  ) RETURNING id INTO v_host_payout_id;
  
  -- Update dispute to resolved_approved
  UPDATE public.disputes
  SET 
    status = 'resolved_approved',
    admin_decision = 'approved',
    approved_refund_amount = p_approved_claim_amount, -- Using same column for claim amount
    resolution_notes = p_resolution_notes,
    resolved_by_admin_id = auth.uid(),
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_dispute_id;
  
  -- Send resolution message to host
  PERFORM send_dispute_resolution_message(
    p_dispute_id,
    'approved',
    p_approved_claim_amount,
    p_resolution_notes,
    FALSE -- is_guest_dispute = false (host dispute)
  );
  
  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'guest_debt_id', v_guest_debt_id,
    'host_payout_id', v_host_payout_id,
    'claim_amount', p_approved_claim_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Main dispute resolution function
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id UUID,
  p_admin_decision TEXT,
  p_approved_refund_amount NUMERIC DEFAULT NULL,
  p_resolution_notes TEXT DEFAULT NULL,
  p_is_submit BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
  v_new_status dispute_status;
  v_result JSON;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Validate decision
  IF p_admin_decision NOT IN ('approved', 'declined', 'on_hold', 'hold') THEN
    RETURN json_build_object('success', false, 'error', 
      format('Invalid decision: must be approved, declined, or on_hold (got: %s)', p_admin_decision));
  END IF;

  -- Lock the dispute
  SELECT * INTO v_dispute
  FROM public.disputes
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
      -- Process refund/claim based on user_role
      IF v_dispute.user_role = 'guest' THEN
        -- Guest initiated dispute - process refund
        v_result := process_guest_refund(p_dispute_id, p_approved_refund_amount, p_resolution_notes);
        RETURN v_result;
      ELSIF v_dispute.user_role = 'host' THEN
        -- Host initiated dispute - process claim
        v_result := process_host_claim(p_dispute_id, p_approved_refund_amount, p_resolution_notes);
        RETURN v_result;
      ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid user_role in dispute');
      END IF;
    ELSIF p_admin_decision = 'declined' THEN
      v_new_status := 'resolved_declined'::dispute_status;
      
      -- Update dispute to declined
      UPDATE public.disputes
      SET
        admin_decision = p_admin_decision,
        resolution_notes = p_resolution_notes,
        status = v_new_status,
        resolved_by_admin_id = auth.uid(),
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = p_dispute_id;
      
      -- Send decline message
      PERFORM send_dispute_resolution_message(
        p_dispute_id,
        'declined',
        NULL,
        p_resolution_notes,
        v_dispute.user_role = 'guest'
      );
    END IF;
  ELSE
    -- When saving draft, always set to in_progress unless explicitly on_hold
    IF p_admin_decision IN ('on_hold', 'hold') THEN
      v_new_status := 'on_hold'::dispute_status;
    ELSE
      v_new_status := 'in_progress'::dispute_status;
    END IF;
    
    -- Update the dispute (draft save)
    UPDATE public.disputes
    SET
      admin_decision = p_admin_decision,
      approved_refund_amount = COALESCE(p_approved_refund_amount, approved_refund_amount),
      resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
      status = v_new_status,
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
    -- Send on_hold message if applicable
    IF v_new_status = 'on_hold'::dispute_status THEN
      PERFORM send_dispute_resolution_message(
        p_dispute_id,
        'on_hold',
        NULL,
        p_resolution_notes,
        v_dispute.user_role = 'guest'
      );
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'status', v_new_status::TEXT,
    'decision', p_admin_decision
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Process guest debt payment (future use)
CREATE OR REPLACE FUNCTION public.process_guest_debt_payment(
  p_guest_debt_id UUID,
  p_payment_amount NUMERIC,
  p_payment_currency TEXT,
  p_payment_provider TEXT DEFAULT 'stripe'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debt RECORD;
  v_transaction_id UUID;
  v_host_payout_id UUID;
BEGIN
  -- Lock guest debt
  SELECT * INTO v_debt
  FROM public.guest_debts
  WHERE id = p_guest_debt_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest debt not found';
  END IF;
  
  IF v_debt.status != 'outstanding' THEN
    RAISE EXCEPTION 'Debt is not in outstanding status';
  END IF;
  
  -- Validate currency match
  IF p_payment_currency != v_debt.currency THEN
    RAISE EXCEPTION 'Payment currency (%) must match debt currency (%)', 
      p_payment_currency, v_debt.currency;
  END IF;
  
  IF p_payment_amount != v_debt.amount THEN
    RAISE EXCEPTION 'Payment amount must equal debt amount';
  END IF;
  
  -- Create payment transaction
  INSERT INTO public.transactions (
    booking_id,
    type,
    amount,
    currency,
    provider,
    status,
    dispute_id
  ) VALUES (
    v_debt.booking_id,
    'damage_charge',
    p_payment_amount,
    p_payment_currency,
    p_payment_provider,
    'succeeded',
    v_debt.dispute_id
  ) RETURNING id INTO v_transaction_id;
  
  -- Mark debt as paid
  UPDATE public.guest_debts
  SET 
    status = 'paid',
    paid_at = NOW(),
    payment_transaction_id = v_transaction_id
  WHERE id = p_guest_debt_id;
  
  -- Activate host payout (change from pending_guest_payment to pending)
  UPDATE public.payouts
  SET 
    status = 'pending',
    notes = notes || format(E'\n\nGuest debt paid on %s. Transaction ID: %s. Now ready for payout processing.',
      NOW()::TEXT, v_transaction_id::TEXT),
    updated_at = NOW()
  WHERE dispute_id = v_debt.dispute_id
    AND status = 'pending_guest_payment'
  RETURNING id INTO v_host_payout_id;
  
  RETURN json_build_object(
    'success', true,
    'guest_debt_id', p_guest_debt_id,
    'transaction_id', v_transaction_id,
    'host_payout_id', v_host_payout_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Apply outstanding debts to host payout
CREATE OR REPLACE FUNCTION public.apply_outstanding_debts_to_payout(p_payout_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout RECORD;
  v_debt RECORD;
  v_remaining_payout NUMERIC;
  v_applied_amount NUMERIC;
  v_total_settled NUMERIC := 0;
BEGIN
  -- Lock and fetch payout
  SELECT * INTO v_payout
  FROM public.payouts
  WHERE id = p_payout_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found';
  END IF;
  
  IF v_payout.status != 'pending' THEN
    RAISE EXCEPTION 'Can only apply debts to pending payouts';
  END IF;
  
  v_remaining_payout := v_payout.amount;
  
  -- Process all outstanding debts for this host (oldest first)
  FOR v_debt IN 
    SELECT * FROM public.payouts
    WHERE host_user_id = v_payout.host_user_id
      AND status = 'debit'
      AND amount < 0
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN v_remaining_payout <= 0;
    
    v_applied_amount := LEAST(v_remaining_payout, ABS(v_debt.amount));
    v_remaining_payout := v_remaining_payout - v_applied_amount;
    v_total_settled := v_total_settled + v_applied_amount;
    
    IF v_applied_amount >= ABS(v_debt.amount) THEN
      -- Debt fully settled
      UPDATE public.payouts
      SET 
        status = 'settled',
        notes = COALESCE(notes, '') || format(E'\n\nFully settled from payout %s on %s',
          p_payout_id::TEXT, NOW()::TEXT),
        updated_at = NOW()
      WHERE id = v_debt.id;
    ELSE
      -- Debt partially settled
      UPDATE public.payouts
      SET 
        amount = v_debt.amount + v_applied_amount, -- Less negative
        status = 'partially_settled',
        notes = COALESCE(notes, '') || format(E'\n\nPartially settled: $%s from payout %s on %s. Remaining debt: $%s',
          v_applied_amount::TEXT, p_payout_id::TEXT, NOW()::TEXT, 
          (ABS(v_debt.amount) - v_applied_amount)::TEXT),
        updated_at = NOW()
      WHERE id = v_debt.id;
    END IF;
  END LOOP;
  
  -- Update the payout with remaining amount after debt deductions
  IF v_total_settled > 0 THEN
    IF v_remaining_payout <= 0 THEN
      -- Payout fully consumed by debts
      UPDATE public.payouts
      SET 
        status = 'cancelled',
        notes = COALESCE(notes, '') || format(E'\n\nFully consumed by debt settlement: $%s. Cancelled on %s',
          v_total_settled::TEXT, NOW()::TEXT),
        updated_at = NOW()
      WHERE id = p_payout_id;
    ELSE
      -- Payout partially reduced by debts
      UPDATE public.payouts
      SET 
        amount = v_remaining_payout,
        notes = COALESCE(notes, '') || format(E'\n\nReduced by debt settlement: $%s. Original: $%s, Remaining: $%s',
          v_total_settled::TEXT, v_payout.amount::TEXT, v_remaining_payout::TEXT),
        updated_at = NOW()
      WHERE id = p_payout_id;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'payout_id', p_payout_id,
    'total_settled', v_total_settled,
    'remaining_payout', v_remaining_payout
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: Expire old guest debts (maintenance function)
CREATE OR REPLACE FUNCTION public.expire_old_guest_debts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE public.guest_debts
  SET 
    status = 'expired',
    notes = COALESCE(notes, '') || format(E'\n\nExpired on %s (past expiration date)', NOW()::TEXT)
  WHERE status = 'outstanding'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'timestamp', NOW()
  );
END;
$$;

-- Function: Admin search guest debts
CREATE OR REPLACE FUNCTION public.admin_search_guest_debts(
  search_query TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  reason_filter TEXT DEFAULT NULL,
  min_amount NUMERIC DEFAULT NULL,
  max_amount NUMERIC DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  id UUID,
  guest_user_id UUID,
  guest_name TEXT,
  guest_email TEXT,
  guest_avatar TEXT,
  dispute_id UUID,
  dispute_display_id TEXT,
  booking_id UUID,
  booking_display_id TEXT,
  listing_title TEXT,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    gd.id,
    gd.guest_user_id,
    CONCAT(p.first_name, ' ', p.last_name) as guest_name,
    p.email as guest_email,
    p.avatar_url as guest_avatar,
    gd.dispute_id,
    CONCAT('D-', SUBSTRING(gd.dispute_id::TEXT, 1, 8)) as dispute_display_id,
    gd.booking_id,
    CONCAT('B-', SUBSTRING(gd.booking_id::TEXT, 1, 8)) as booking_display_id,
    l.title as listing_title,
    gd.amount,
    gd.currency,
    gd.status,
    gd.reason,
    gd.created_at,
    gd.paid_at,
    gd.expires_at,
    gd.notes
  FROM public.guest_debts gd
  INNER JOIN public.profiles p ON p.id = gd.guest_user_id
  INNER JOIN public.bookings b ON b.id = gd.booking_id
  INNER JOIN public.listings l ON l.id = b.listing_id
  WHERE
    (search_query IS NULL OR 
     p.first_name ILIKE '%' || search_query || '%' OR
     p.last_name ILIKE '%' || search_query || '%' OR
     p.email ILIKE '%' || search_query || '%' OR
     l.title ILIKE '%' || search_query || '%')
    AND (status_filter IS NULL OR gd.status = status_filter)
    AND (reason_filter IS NULL OR gd.reason = reason_filter)
    AND (min_amount IS NULL OR gd.amount >= min_amount)
    AND (max_amount IS NULL OR gd.amount <= max_amount)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN gd.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN gd.created_at END ASC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'desc' THEN gd.amount END DESC,
    CASE WHEN sort_by = 'amount' AND sort_order = 'asc' THEN gd.amount END ASC,
    CASE WHEN sort_by = 'expires_at' AND sort_order = 'desc' THEN gd.expires_at END DESC,
    CASE WHEN sort_by = 'expires_at' AND sort_order = 'asc' THEN gd.expires_at END ASC,
    gd.created_at DESC;
END;
$$;

-- ============================================================================
-- PHASE 3: Row Level Security Policies
-- ============================================================================

-- Enable RLS on guest_debts table
ALTER TABLE public.guest_debts ENABLE ROW LEVEL SECURITY;

-- Admins can view all guest debts
CREATE POLICY "Admins can view all guest debts"
  ON public.guest_debts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert guest debts
CREATE POLICY "Admins can insert guest debts"
  ON public.guest_debts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update guest debts
CREATE POLICY "Admins can update guest debts"
  ON public.guest_debts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Guests can view their own debts
CREATE POLICY "Guests can view their own debts"
  ON public.guest_debts FOR SELECT
  USING (auth.uid() = guest_user_id);

-- Update bookings RLS to block users with outstanding debts
-- This will be enforced in the application layer by calling check_guest_outstanding_debts()
-- before allowing a booking to be created