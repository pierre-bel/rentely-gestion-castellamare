import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const isDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) return json({ error: "Missing X-API-Key header" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: key } = await supabase
      .from("host_api_keys")
      .select("id, host_id, revoked_at")
      .eq("key_hash", await sha256(apiKey))
      .maybeSingle();
    if (!key || key.revoked_at) return json({ error: "Invalid API key" }, 401);
    await supabase.from("host_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

    const hostId = key.host_id;
    const url = new URL(req.url);
    const resource = url.pathname.split("/").filter(Boolean).pop();

    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, city, address, base_price, cleaning_fee, checkin_from, checkout_until")
      .eq("host_user_id", hostId);
    const listingIds = (listings || []).map((l) => l.id);

    if (resource === "listings" && req.method === "GET") return json({ data: listings });

    if (resource === "bookings" && req.method === "GET") {
      if (listingIds.length === 0) return json({ data: [] });
      let q = supabase
        .from("bookings")
        .select("id, listing_id, checkin_date, checkout_date, checkin_time, checkout_time, nights, status, total_price, cleaning_fee, guest_name, guest_email, notes, created_at")
        .in("listing_id", listingIds)
        .order("checkin_date");
      const lid = url.searchParams.get("listing_id");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (lid) q = q.eq("listing_id", lid);
      if (from && isDate(from)) q = q.gte("checkout_date", from);
      if (to && isDate(to)) q = q.lte("checkin_date", to);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    if (resource === "bookings" && req.method === "POST") {
      const b = await req.json().catch(() => null);
      if (!b || typeof b.listing_id !== "string" || !listingIds.includes(b.listing_id))
        return json({ error: "Invalid or unknown listing_id" }, 400);
      if (!isDate(b.checkin_date) || !isDate(b.checkout_date) || b.checkout_date <= b.checkin_date)
        return json({ error: "checkin_date and checkout_date (YYYY-MM-DD) required, checkout after checkin" }, 400);
      const listing = listings!.find((l) => l.id === b.listing_id)!;
      const year = parseInt(b.checkin_date.slice(0, 4));
      const { data: yt } = await supabase
        .from("listing_yearly_stay_times")
        .select("checkin_time, checkout_time")
        .eq("listing_id", listing.id).eq("year", year).maybeSingle();
      const nights = Math.round((Date.parse(b.checkout_date) - Date.parse(b.checkin_date)) / 86400000);
      const total = Number(b.total_price) || 0;
      const cleaning = b.cleaning_fee != null ? Number(b.cleaning_fee) || 0 : Number(listing.cleaning_fee) || 0;
      const { data, error } = await supabase.from("bookings").insert({
        listing_id: listing.id,
        guest_user_id: hostId,
        checkin_date: b.checkin_date,
        checkout_date: b.checkout_date,
        checkin_time: yt?.checkin_time || listing.checkin_from || null,
        checkout_time: yt?.checkout_time || listing.checkout_until || null,
        nights,
        guests: 1,
        subtotal: Math.max(total - cleaning, 0),
        cleaning_fee: cleaning,
        total_price: total,
        host_payout_gross: total,
        host_payout_net: total,
        status: "pending_payment",
        currency: "EUR",
        guest_name: typeof b.guest_name === "string" ? b.guest_name.slice(0, 200) : null,
        guest_email: typeof b.guest_email === "string" ? b.guest_email.slice(0, 255) : null,
        notes: [typeof b.notes === "string" ? b.notes.slice(0, 2000) : null, "Créée via API"].filter(Boolean).join(" | "),
      }).select("id").single();
      if (error) return json({ error: error.message }, 400);
      return json({ data }, 201);
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
