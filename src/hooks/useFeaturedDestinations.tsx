import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFeaturedDestinations = () => {
  return useQuery({
    queryKey: ["featured-destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select(`
          id,
          name,
          featured_image_url,
          states_regions (name),
          countries (name)
        `)
        .eq("is_featured", true)
        .eq("is_active", true)
        .not("featured_image_url", "is", null)
        .order("name");

      if (error) throw error;

      // Count listings for each city
      const destinationsWithCounts = await Promise.all(
        data.map(async (city) => {
          const { count } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true })
            .eq("city_id", city.id)
            .eq("status", "approved");

          return {
            id: city.id,
            name: city.name,
            state: city.states_regions?.name,
            country: city.countries?.name,
            image: city.featured_image_url || "/placeholder.svg",
            listingCount: count || 0,
          };
        })
      );

      return destinationsWithCounts;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};
