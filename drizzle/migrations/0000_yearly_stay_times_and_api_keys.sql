CREATE TABLE public.listing_yearly_stay_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  year integer NOT NULL,
  checkin_time text,
  checkout_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_yearly_stay_times TO authenticated;
GRANT ALL ON public.listing_yearly_stay_times TO service_role;
ALTER TABLE public.listing_yearly_stay_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts manage their yearly stay times" ON public.listing_yearly_stay_times
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_user_id = auth.uid()));

CREATE TABLE public.host_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  prefix text NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.host_api_keys TO authenticated;
GRANT ALL ON public.host_api_keys TO service_role;
ALTER TABLE public.host_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts manage their api keys" ON public.host_api_keys
FOR ALL TO authenticated
USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());