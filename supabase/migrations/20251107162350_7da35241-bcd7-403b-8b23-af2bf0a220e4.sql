-- Drop the old unique constraint that doesn't include listing_id
DROP INDEX IF EXISTS public.idx_unique_thread_participants;

-- Create new unique constraint that includes listing_id for proper thread separation
CREATE UNIQUE INDEX idx_unique_thread_participants 
ON public.message_threads (
  LEAST(participant_1_id, participant_2_id),
  GREATEST(participant_1_id, participant_2_id),
  COALESCE(booking_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid)
);