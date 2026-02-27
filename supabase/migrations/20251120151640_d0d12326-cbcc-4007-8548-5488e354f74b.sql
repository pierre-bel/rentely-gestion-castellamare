-- Drop the existing unique constraint that doesn't account for thread_type
DROP INDEX IF EXISTS public.idx_unique_thread_participants;

-- Create new unique constraint that includes thread_type
-- This allows both user_to_user and user_to_support threads for the same participants and booking
CREATE UNIQUE INDEX idx_unique_thread_participants ON public.message_threads USING btree (
  LEAST(participant_1_id, participant_2_id),
  GREATEST(participant_1_id, participant_2_id),
  COALESCE(booking_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(thread_type, 'user_to_user'::thread_type)
);