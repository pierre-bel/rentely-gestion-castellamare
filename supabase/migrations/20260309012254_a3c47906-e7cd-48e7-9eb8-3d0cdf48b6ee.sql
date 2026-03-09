CREATE OR REPLACE VIEW public.public_listing_weekly_pricing AS
SELECT listing_id, week_start_date, weekly_rate, weekend_rate, extra_night_weekend_rate
FROM listing_weekly_pricing
WHERE listing_id IN (SELECT id FROM listings WHERE status = 'approved');

GRANT SELECT ON public.public_listing_weekly_pricing TO anon, authenticated;
