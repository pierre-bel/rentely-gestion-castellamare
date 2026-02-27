-- Add missing dispute status enum values for resolved states

-- Add 'resolved_approved' status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'resolved_approved' 
    AND enumtypid = 'dispute_status'::regtype
  ) THEN
    ALTER TYPE dispute_status ADD VALUE 'resolved_approved';
  END IF;
END $$;

-- Add 'resolved_declined' status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'resolved_declined' 
    AND enumtypid = 'dispute_status'::regtype
  ) THEN
    ALTER TYPE dispute_status ADD VALUE 'resolved_declined';
  END IF;
END $$;