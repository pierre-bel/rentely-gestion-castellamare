import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReviewCriterion {
  criterion_key: string;
  label: string;
  description: string;
  sort_order: number;
}

const DEFAULT_CRITERIA: ReviewCriterion[] = [
  { criterion_key: "rating_cleanliness", label: "Propreté", description: "État de propreté du logement", sort_order: 0 },
  { criterion_key: "rating_location", label: "Emplacement", description: "Localisation et accessibilité", sort_order: 1 },
  { criterion_key: "rating_communication", label: "Communication", description: "Réactivité et clarté de l'hôte", sort_order: 2 },
  { criterion_key: "rating_value", label: "Rapport qualité/prix", description: "Adéquation prix / prestation", sort_order: 3 },
  { criterion_key: "rating_maintenance", label: "État du logement", description: "Travaux, équipements à réparer", sort_order: 4 },
];

/**
 * Fetches review criteria for a host. Used in portal (by host_user_id) or host dashboard (by current user).
 * Falls back to default criteria if none configured.
 */
export function useHostReviewCriteria(hostUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["host-review-criteria", hostUserId],
    queryFn: async (): Promise<ReviewCriterion[]> => {
      if (!hostUserId) return DEFAULT_CRITERIA;

      const { data, error } = await supabase
        .from("public_host_review_criteria")
        .select("*")
        .eq("host_user_id", hostUserId)
        .order("sort_order");

      if (error || !data || data.length === 0) return DEFAULT_CRITERIA;

      return (data as any[]).map((d) => ({
        criterion_key: d.criterion_key,
        label: d.label,
        description: d.description || "",
        sort_order: d.sort_order,
      }));
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}

export { DEFAULT_CRITERIA };
