
-- Add ON DELETE CASCADE to all foreign keys referencing listings

-- bookings.listing_id
ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_listing_id_fkey,
  ADD CONSTRAINT bookings_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- cleaning_staff_listings.listing_id
ALTER TABLE public.cleaning_staff_listings
  DROP CONSTRAINT cleaning_staff_listings_listing_id_fkey,
  ADD CONSTRAINT cleaning_staff_listings_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- disputes.listing_id
ALTER TABLE public.disputes
  DROP CONSTRAINT disputes_listing_id_fkey,
  ADD CONSTRAINT disputes_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- listing_availability.listing_id
ALTER TABLE public.listing_availability
  DROP CONSTRAINT listing_availability_listing_id_fkey,
  ADD CONSTRAINT listing_availability_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- listing_moderation_feedback.listing_id
ALTER TABLE public.listing_moderation_feedback
  DROP CONSTRAINT listing_moderation_feedback_listing_id_fkey,
  ADD CONSTRAINT listing_moderation_feedback_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- listing_rooms.listing_id
ALTER TABLE public.listing_rooms
  DROP CONSTRAINT listing_rooms_listing_id_fkey,
  ADD CONSTRAINT listing_rooms_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- listing_weekly_pricing.listing_id
ALTER TABLE public.listing_weekly_pricing
  DROP CONSTRAINT listing_weekly_pricing_listing_id_fkey,
  ADD CONSTRAINT listing_weekly_pricing_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
