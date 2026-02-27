-- Create dispute status enum
CREATE TYPE dispute_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed',
  'escalated'
);

-- Create dispute category enum
CREATE TYPE dispute_category AS ENUM (
  'refund_request',
  'policy_violation',
  'property_damage',
  'cleanliness_issue',
  'amenity_issue',
  'safety_concern',
  'billing_dispute',
  'other'
);

-- Create disputes table
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core references
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  support_thread_id UUID REFERENCES public.message_threads(id) ON DELETE SET NULL,
  
  -- Dispute details
  category dispute_category NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  requested_refund_amount NUMERIC,
  
  -- Parties involved
  initiated_by_user_id UUID NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('guest', 'host')),
  
  -- Admin handling
  assigned_admin_id UUID,
  
  -- Evidence/attachments (URLs to storage)
  attachment_urls TEXT[] DEFAULT '{}',
  
  -- Resolution
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_disputes_booking_id ON public.disputes(booking_id);
CREATE INDEX idx_disputes_listing_id ON public.disputes(listing_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_disputes_initiated_by ON public.disputes(initiated_by_user_id);
CREATE INDEX idx_disputes_support_thread ON public.disputes(support_thread_id);
CREATE INDEX idx_disputes_created_at ON public.disputes(created_at DESC);

-- Unique constraint: only one active dispute per booking
CREATE UNIQUE INDEX unique_active_dispute_per_booking 
ON public.disputes(booking_id) 
WHERE status IN ('open', 'in_progress', 'escalated');

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own disputes"
ON public.disputes FOR SELECT
USING (auth.uid() = initiated_by_user_id);

CREATE POLICY "Hosts can view disputes for their listings"
ON public.disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = disputes.listing_id
    AND l.host_user_id = auth.uid()
  )
);

CREATE POLICY "Guests can view disputes for their bookings"
ON public.disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = disputes.booking_id
    AND b.guest_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all disputes"
ON public.disputes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can create disputes"
ON public.disputes FOR INSERT
WITH CHECK (auth.uid() = initiated_by_user_id);

CREATE POLICY "Admins can update disputes"
ON public.disputes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp trigger
CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for dispute attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-attachments', 'dispute-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for dispute-attachments bucket
CREATE POLICY "Authenticated users can upload dispute attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dispute-attachments'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their own dispute attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'dispute-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Create function to create dispute with booking-scoped support thread
CREATE OR REPLACE FUNCTION public.create_dispute_with_support_thread(
  p_booking_id UUID,
  p_category dispute_category,
  p_subject TEXT,
  p_description TEXT,
  p_requested_refund_amount NUMERIC DEFAULT NULL,
  p_attachment_urls TEXT[] DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_listing_id UUID;
  v_user_role TEXT;
  v_support_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_thread_id UUID;
  v_dispute_id UUID;
  v_message_id UUID;
  v_listing_title TEXT;
  v_formatted_message TEXT;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get listing_id and validate access
  SELECT listing_id INTO v_listing_id
  FROM public.bookings
  WHERE id = p_booking_id;
  
  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Determine user role (guest or host)
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = p_booking_id AND guest_user_id = v_user_id
  ) THEN
    v_user_role := 'guest';
  ELSIF EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = v_listing_id AND host_user_id = v_user_id
  ) THEN
    v_user_role := 'host';
  ELSE
    RAISE EXCEPTION 'Unauthorized: You are not associated with this booking';
  END IF;
  
  -- Check for existing active dispute
  IF EXISTS (
    SELECT 1 FROM public.disputes
    WHERE booking_id = p_booking_id
    AND status IN ('open', 'in_progress', 'escalated')
  ) THEN
    RAISE EXCEPTION 'An active dispute already exists for this booking';
  END IF;
  
  -- Get listing title for thread context
  SELECT title INTO v_listing_title
  FROM public.listings
  WHERE id = v_listing_id;
  
  -- CRITICAL: Find existing booking-scoped support thread OR create new one
  -- This ensures one booking = one unique support thread
  SELECT id INTO v_thread_id
  FROM public.message_threads
  WHERE booking_id = p_booking_id
    AND thread_type = 'user_to_support'
    AND (
      (participant_1_id = v_user_id AND participant_2_id = v_support_user_id)
      OR (participant_1_id = v_support_user_id AND participant_2_id = v_user_id)
    )
  LIMIT 1;
  
  -- Create new thread if doesn't exist
  IF v_thread_id IS NULL THEN
    INSERT INTO public.message_threads (
      participant_1_id,
      participant_2_id,
      booking_id,
      listing_id,
      thread_type
    ) VALUES (
      v_user_id,
      v_support_user_id,
      p_booking_id,
      v_listing_id,
      'user_to_support'
    )
    RETURNING id INTO v_thread_id;
  END IF;
  
  -- Create dispute record
  INSERT INTO public.disputes (
    booking_id,
    listing_id,
    support_thread_id,
    category,
    subject,
    description,
    requested_refund_amount,
    attachment_urls,
    initiated_by_user_id,
    user_role,
    status
  ) VALUES (
    p_booking_id,
    v_listing_id,
    v_thread_id,
    p_category,
    p_subject,
    p_description,
    p_requested_refund_amount,
    p_attachment_urls,
    v_user_id,
    v_user_role,
    'open'
  )
  RETURNING id INTO v_dispute_id;
  
  -- Format initial message with dispute details
  v_formatted_message := format(
    E'🚨 **Dispute Initiated**\n\n' ||
    E'**Category:** %s\n' ||
    E'**Subject:** %s\n\n' ||
    E'**Description:**\n%s\n\n' ||
    CASE WHEN p_requested_refund_amount IS NOT NULL 
      THEN format(E'**Requested Refund:** $%s\n\n', p_requested_refund_amount::TEXT)
      ELSE ''
    END ||
    E'**Dispute ID:** %s\n' ||
    E'**Booking ID:** %s\n' ||
    E'**Property:** %s',
    REPLACE(p_category::TEXT, '_', ' '),
    p_subject,
    p_description,
    SUBSTRING(v_dispute_id::TEXT, 1, 8),
    SUBSTRING(p_booking_id::TEXT, 1, 8),
    v_listing_title
  );
  
  -- Insert initial message into support thread
  INSERT INTO public.messages (
    thread_id,
    from_user_id,
    to_user_id,
    body,
    read
  ) VALUES (
    v_thread_id,
    v_user_id,
    v_support_user_id,
    v_formatted_message,
    false
  )
  RETURNING id INTO v_message_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'dispute_id', v_dispute_id,
    'thread_id', v_thread_id,
    'message_id', v_message_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;