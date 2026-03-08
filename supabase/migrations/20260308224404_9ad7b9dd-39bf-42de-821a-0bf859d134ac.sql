
ALTER TABLE public.reviews
  ADD COLUMN rating_cleanliness smallint,
  ADD COLUMN rating_location smallint,
  ADD COLUMN rating_communication smallint,
  ADD COLUMN rating_value smallint,
  ADD COLUMN rating_maintenance smallint;
