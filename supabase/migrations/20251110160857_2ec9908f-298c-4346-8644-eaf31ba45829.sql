-- Migration: Complete Post-Payout Refund Architecture
-- Adds debt tracking, automatic recovery, and proper status management

-- ==========================================
-- STEP 1: Add Missing Columns
-- ==========================================

-- Add dispute_id to payouts table (fixes the error)
ALTER TABLE public.payouts 
ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES public.disputes(id);

-- Add refund_transaction_id to disputes table
ALTER TABLE public.disputes 
ADD COLUMN IF NOT EXISTS refund_transaction_id UUID REFERENCES public.transactions(id);

-- ==========================================
-- STEP 2: Add New Status Values
-- ==========================================

-- Add new payout status values for debt tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status_enum') THEN
    -- Create enum if it doesn't exist
    CREATE TYPE payout_status_enum AS ENUM ('pending', 'completed', 'failed', 'cancelled');
  END IF;
END $$;

-- Note: Since payout status is TEXT, we don't need to alter an enum
-- The application will use these string values: 'debit', 'applied_to_debt', 'partially_settled', 'settled'

-- Add 'on_hold' to dispute_status enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'on_hold' 
    AND enumtypid = 'dispute_status'::regtype
  ) THEN
    ALTER TYPE dispute_status ADD VALUE 'on_hold';
  END IF;
END $$;

-- ==========================================
-- STEP 3: Create Debt Recovery Function
-- ==========================================

CREATE OR REPLACE FUNCTION public.apply_outstanding_debts_to_payout(p_payout_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_payout RECORD;
  v_debt RECORD;
  v_remaining_payout NUMERIC;
  v_applied_amount NUMERIC;
  v_total_settled NUMERIC := 0;
BEGIN
  -- Lock the pending payout
  SELECT * INTO v_payout
  FROM payouts
  WHERE id = p_payout_id
    AND status = 'pending'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payout not found or not pending');
  END IF;
  
  v_remaining_payout := v_payout.amount;
  
  -- Find all outstanding debts for this host (ordered by oldest first)
  FOR v_debt IN
    SELECT *
    FROM payouts
    WHERE host_user_id = v_payout.host_user_id
      AND status IN ('debit', 'partially_settled')
      AND amount < 0
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_payout <= 0;
    
    -- Calculate how much of this debt we can settle
    v_applied_amount := LEAST(ABS(v_debt.amount), v_remaining_payout);
    
    -- Update debt record
    UPDATE payouts
    SET
      status = CASE
        WHEN ABS(amount) <= v_applied_amount THEN 'settled'
        ELSE 'partially_settled'
      END,
      amount = amount + v_applied_amount,  -- Reduce debt (move toward zero)
      notes = COALESCE(notes || E'\n\n', '') ||
             format('Applied $%s from payout %s on %s',
               v_applied_amount,
               'P-' || SUBSTRING(p_payout_id::TEXT, 1, 8),
               NOW()::DATE),
      updated_at = NOW()
    WHERE id = v_debt.id;
    
    -- Reduce remaining payout
    v_remaining_payout := v_remaining_payout - v_applied_amount;
    v_total_settled := v_total_settled + v_applied_amount;
    
  END LOOP;
  
  -- Update the original payout
  IF v_total_settled > 0 THEN
    IF v_remaining_payout <= 0 THEN
      -- Entire payout consumed by debt
      UPDATE payouts
      SET
        status = 'applied_to_debt',
        amount = 0,
        notes = COALESCE(notes || E'\n\n', '') ||
               format('Entire payout ($%s) applied to settle outstanding debts. Total settled: $%s',
                 v_payout.amount, v_total_settled),
        updated_at = NOW()
      WHERE id = p_payout_id;
    ELSE
      -- Partial debt settlement
      UPDATE payouts
      SET
        amount = v_remaining_payout,
        notes = COALESCE(notes || E'\n\n', '') ||
               format('$%s deducted to settle debts. Original: $%s, Remaining: $%s',
                 v_total_settled, v_payout.amount, v_remaining_payout),
        updated_at = NOW()
      WHERE id = p_payout_id;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'payout_id', p_payout_id,
    'original_amount', v_payout.amount,
    'remaining_amount', v_remaining_payout,
    'total_debt_settled', v_total_settled
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ==========================================
-- STEP 4: Replace admin_resolve_dispute Function
-- ==========================================

CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id UUID,
  p_admin_decision TEXT,
  p_approved_refund_amount NUMERIC,
  p_resolution_notes TEXT,
  p_is_submit BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
  v_currency TEXT;
  v_refund_transaction_id UUID;
  v_original_payout RECORD;
  v_refund_percentage NUMERIC;
  v_new_host_payout NUMERIC;
BEGIN
  -- Security check
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

  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = v_dispute.booking_id;

  v_currency := COALESCE(v_booking.currency, 'USD');

  -- ==========================================
  -- PART 1: STATUS MANAGEMENT (Kanban Logic)
  -- ==========================================
  
  IF p_is_submit THEN
    -- SUBMIT ACTION
    UPDATE disputes SET
      admin_decision = p_admin_decision,
      approved_refund_amount = p_approved_refund_amount,
      resolution_notes = p_resolution_notes,
      status = CASE
        WHEN p_admin_decision = 'approved' THEN 'resolved_approved'::dispute_status
        WHEN p_admin_decision = 'declined' THEN 'resolved_declined'::dispute_status
        WHEN p_admin_decision = 'on_hold' THEN 'on_hold'::dispute_status
      END,
      resolved_at = CASE 
        WHEN p_admin_decision IN ('approved', 'declined') THEN NOW() 
        ELSE NULL 
      END,
      resolved_by_admin_id = auth.uid(),
      assigned_admin_id = COALESCE(assigned_admin_id, auth.uid()),
      updated_at = NOW()
    WHERE id = p_dispute_id;
    
  ELSE
    -- SAVE ACTION
    UPDATE disputes SET
      admin_decision = p_admin_decision,
      approved_refund_amount = p_approved_refund_amount,
      resolution_notes = p_resolution_notes,
      status = CASE
        WHEN status IN ('open', 'pending') THEN 'in_progress'::dispute_status
        ELSE status
      END,
      assigned_admin_id = COALESCE(assigned_admin_id, auth.uid()),
      updated_at = NOW()
    WHERE id = p_dispute_id;
  END IF;

  -- ==========================================
  -- PART 2: REFUND & PAYMENT INTEGRATION
  -- Only execute on SUBMIT with APPROVED decision
  -- ==========================================
  
  IF p_is_submit AND p_admin_decision = 'approved' AND p_approved_refund_amount > 0 THEN
    
    -- Validation: Refund cannot exceed guest payment
    IF p_approved_refund_amount > v_booking.total_price THEN
      RAISE EXCEPTION 'Refund amount ($%) cannot exceed booking total ($%)', 
        p_approved_refund_amount, v_booking.total_price;
    END IF;
    
    -- ==========================================
    -- STEP 1: Create Guest Refund Transaction
    -- ==========================================
    INSERT INTO public.transactions (
      booking_id,
      type,
      amount,
      currency,
      provider,
      status
    ) VALUES (
      v_dispute.booking_id,
      'refund',
      p_approved_refund_amount,
      v_currency,
      'stripe',
      'succeeded'
    )
    RETURNING id INTO v_refund_transaction_id;
    
    -- Link transaction to dispute
    UPDATE disputes 
    SET refund_transaction_id = v_refund_transaction_id
    WHERE id = p_dispute_id;
    
    -- ==========================================
    -- STEP 2: Adjust Host Payout
    -- ==========================================
    
    -- Find the host's payout for this booking
    SELECT * INTO v_original_payout
    FROM payouts
    WHERE booking_id = v_dispute.booking_id
      AND host_user_id = (SELECT host_user_id FROM listings WHERE id = v_dispute.listing_id)
    FOR UPDATE;
    
    IF v_original_payout.id IS NOT NULL THEN
      
      -- Calculate refund percentage and new host payout
      v_refund_percentage := p_approved_refund_amount / v_booking.total_price;
      v_new_host_payout := v_original_payout.amount * (1 - v_refund_percentage);
      
      IF v_original_payout.status = 'pending' THEN
        -- CASE A: Payout not yet processed - reduce amount
        
        IF v_new_host_payout <= 0 THEN
          -- Full refund: Cancel the payout entirely
          UPDATE payouts
          SET 
            status = 'cancelled',
            amount = 0,
            notes = COALESCE(notes || E'\n\n', '') || 
                   format('CANCELLED: Dispute %s approved with $%s refund (%s%% of booking). Original payout: $%s.',
                     'D-' || SUBSTRING(p_dispute_id::TEXT, 1, 8),
                     p_approved_refund_amount,
                     ROUND(v_refund_percentage * 100, 1),
                     v_original_payout.amount),
            updated_at = NOW()
          WHERE id = v_original_payout.id;
          
        ELSE
          -- Partial refund: Reduce the payout amount
          UPDATE payouts
          SET 
            amount = v_new_host_payout,
            notes = COALESCE(notes || E'\n\n', '') || 
                   format('ADJUSTED: Dispute %s approved with $%s refund (%s%% of booking). Payout reduced from $%s to $%s.',
                     'D-' || SUBSTRING(p_dispute_id::TEXT, 1, 8),
                     p_approved_refund_amount,
                     ROUND(v_refund_percentage * 100, 1),
                     v_original_payout.amount,
                     v_new_host_payout),
            updated_at = NOW()
          WHERE id = v_original_payout.id;
        END IF;
        
      ELSIF v_original_payout.status = 'completed' THEN
        -- CASE B: Payout already processed - create debt record
        
        INSERT INTO public.payouts (
          host_user_id,
          booking_id,
          amount,
          currency,
          status,
          dispute_id,
          notes,
          created_at,
          updated_at
        ) VALUES (
          v_original_payout.host_user_id,
          v_dispute.booking_id,
          -1 * (v_original_payout.amount * v_refund_percentage),
          v_currency,
          'debit',
          p_dispute_id,
          format('DEBT: Dispute %s approved after payout completed. Guest refunded $%s (%s%% of booking total $%s). Host owes $%s. Original payout: $%s (paid on %s). This debt will be deducted from future payouts. Reason: %s',
            'D-' || SUBSTRING(p_dispute_id::TEXT, 1, 8),
            p_approved_refund_amount,
            ROUND(v_refund_percentage * 100, 1),
            v_booking.total_price,
            ROUND(v_original_payout.amount * v_refund_percentage, 2),
            v_original_payout.amount,
            v_original_payout.payout_date,
            COALESCE(p_resolution_notes, 'No additional notes')),
          NOW(),
          NOW()
        );
        
      ELSE
        -- Payout in other status - log warning
        RAISE WARNING 'Host payout (%) has status "%". Cannot adjust. Manual intervention may be required.',
          v_original_payout.id, v_original_payout.status;
      END IF;
      
    END IF;
    
  END IF;

  RETURN json_build_object(
    'success', true,
    'dispute_id', p_dispute_id,
    'refund_transaction_id', v_refund_transaction_id,
    'action', CASE WHEN p_is_submit THEN 'submitted' ELSE 'saved' END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;