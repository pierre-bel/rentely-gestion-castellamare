
CREATE TABLE public.listing_weekly_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL,
  week_start_date date NOT NULL,
  nightly_rate numeric NOT NULL DEFAULT 0,
  weekend_nightly_rate numeric NOT NULL DEFAULT 0,
  extra_night_weekend_rate numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(listing_id, week_start_date)
);

ALTER TABLE public.listing_weekly_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own pricing" ON public.listing_weekly_pricing
  FOR SELECT TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can insert their own pricing" ON public.listing_weekly_pricing
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own pricing" ON public.listing_weekly_pricing
  FOR UPDATE TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own pricing" ON public.listing_weekly_pricing
  FOR DELETE TO authenticated
  USING (auth.uid() = host_user_id);

CREATE POLICY "Admins can view all pricing" ON public.listing_weekly_pricing
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
