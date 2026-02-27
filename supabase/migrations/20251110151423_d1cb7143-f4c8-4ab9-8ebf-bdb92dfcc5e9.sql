-- Fix existing function by dropping and recreating with a consistent JSONB payload
DROP FUNCTION IF EXISTS public.admin_get_dispute_details(uuid);

CREATE FUNCTION public.admin_get_dispute_details(p_dispute_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  select jsonb_build_object(
    'dispute',
      (to_jsonb(d) - 'attachment_urls') ||
      jsonb_build_object('attachments', coalesce(to_jsonb(d.attachment_urls), '[]'::jsonb)),
    'booking', to_jsonb(b),
    'listing', to_jsonb(l),
    'guest', jsonb_build_object(
      'id', g.id,
      'name', nullif(trim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,'')), ''),
      'email', g.email,
      'avatar_url', g.avatar_url
    ),
    'host', jsonb_build_object(
      'id', h.id,
      'name', nullif(trim(coalesce(h.first_name,'') || ' ' || coalesce(h.last_name,'')), ''),
      'email', h.email,
      'avatar_url', h.avatar_url
    )
  )
  from public.disputes d
  left join public.bookings b on b.id = d.booking_id
  left join public.listings l on l.id = d.listing_id
  left join public.profiles g on g.id = d.initiated_by_user_id
  left join public.profiles h on h.id = l.host_user_id
  where d.id = p_dispute_id;
$$;