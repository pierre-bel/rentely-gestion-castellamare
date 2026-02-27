-- Add 'pending' to dispute_status enum
ALTER TYPE dispute_status ADD VALUE IF NOT EXISTS 'pending';