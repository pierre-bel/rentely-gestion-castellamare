import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      location,
      city_id,
      state_region_id,
      country_id,
      checkIn,
      checkOut,
      guests,
      priceMin,
      priceMax,
      bedrooms,
      bathrooms,
      propertyType,
      amenities,
    } = await req.json();

    console.log('Search parameters:', {
      location,
      city_id,
      state_region_id,
      country_id,
      checkIn,
      checkOut,
      guests,
      priceMin,
      priceMax,
      bedrooms,
      bathrooms,
      propertyType,
      amenities: amenities?.length || 0,
    });

    // Build base query
    let query = supabase
      .from('listings')
      .select('*')
      .eq('status', 'approved')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false });

    // Apply price range
    if (priceMin !== undefined && priceMin >= 0) {
      query = query.gte('base_price', priceMin);
    }
    if (priceMax !== undefined && priceMax > 0) {
      query = query.lte('base_price', priceMax);
    }

    // Apply guest count
    if (guests && guests > 0) {
      query = query.gte('guests_max', guests);
    }

    // Apply location filter with priority:
    // 1. Specific city_id (most precise)
    // 2. Specific state_region_id (regional)
    // 3. Specific country_id (country-wide)
    // 4. Text search on city/country (legacy fallback)
    if (city_id) {
      query = query.eq('city_id', city_id);
      console.log(`Filtering by city_id: ${city_id}`);
    } else if (state_region_id) {
      query = query.eq('state_region_id', state_region_id);
      console.log(`Filtering by state_region_id: ${state_region_id}`);
    } else if (country_id) {
      query = query.eq('country_id', country_id);
      console.log(`Filtering by country_id: ${country_id}`);
    } else if (location && location.trim() !== '') {
      query = query.or(`city.ilike.%${location}%,state.ilike.%${location}%,country.ilike.%${location}%`);
      console.log(`Filtering by text location: ${location}`);
    }

    // Apply property type filter
    if (propertyType && propertyType !== 'all') {
      query = query.eq('type', propertyType);
    }

    // Apply bedrooms filter
    if (bedrooms && bedrooms !== 'any') {
      query = query.gte('bedrooms', parseInt(bedrooms));
    }

    // Apply bathrooms filter
    if (bathrooms && bathrooms !== 'any') {
      query = query.gte('bathrooms', parseInt(bathrooms));
    }

    const { data: listings, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Initial query returned ${listings?.length || 0} listings`);

    // Apply amenities filter (client-side since we need array containment)
    let filteredListings = listings || [];
    if (amenities && amenities.length > 0) {
      filteredListings = filteredListings.filter((listing) =>
        amenities.every((amenity: string) => listing.amenities?.includes(amenity))
      );
      console.log(`After amenities filter: ${filteredListings.length} listings`);
    }

    // Apply date availability filter
    if (checkIn && checkOut) {
      // Query bookings table for confirmed/pending bookings that overlap with search dates
      const { data: conflictingBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('listing_id')
        .in('status', ['confirmed', 'pending_payment', 'completed'])
        .or(`and(checkin_date.lte.${checkOut},checkout_date.gte.${checkIn})`);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
      }

      // Query listing_availability table for manually blocked dates that overlap with search dates
      const { data: blockedDates, error: blockedDatesError } = await supabase
        .from('listing_availability')
        .select('listing_id')
        .is('price', null)
        .lte('start_date', checkOut)
        .gte('end_date', checkIn);

      if (blockedDatesError) {
        console.error('Error fetching blocked dates:', blockedDatesError);
      }

      // Combine both booking conflicts and manually blocked dates
      const unavailableListingIds = new Set([
        ...(conflictingBookings?.map((b) => b.listing_id) || []),
        ...(blockedDates?.map((b) => b.listing_id) || [])
      ]);

      // Filter out listings with conflicts or blocked dates
      const beforeFilterCount = filteredListings.length;
      filteredListings = filteredListings.filter(
        (listing) => !unavailableListingIds.has(listing.id)
      );

      console.log(`Filtered out ${beforeFilterCount - filteredListings.length} listings due to availability conflicts (bookings + manual blocks)`);
      console.log(`After date availability filter: ${filteredListings.length} listings`);
    }

    console.log(`Final result: ${filteredListings.length} listings matching all criteria`);

    return new Response(
      JSON.stringify({
        listings: filteredListings,
        count: filteredListings.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in search-listings function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
