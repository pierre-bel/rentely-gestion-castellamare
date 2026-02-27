import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoData } from "@/hooks/useDemoData";

export const useDisputeDetails = (disputeId: string | null) => {
  const { isDemoMode, getAdminDisputeDetails } = useDemoData();
  
  return useQuery({
    queryKey: ["dispute-details", disputeId, isDemoMode],
    queryFn: async () => {
      if (!disputeId) throw new Error("No dispute ID");
      
      if (isDemoMode) {
        // DEMO MODE: Get from localStorage
        const data = getAdminDisputeDetails(disputeId);
        if (!data) throw new Error("Dispute not found");
        return data;
      } else {
        // REAL MODE: Query Supabase
        const { data, error } = await supabase.rpc("admin_get_dispute_details", {
          p_dispute_id: disputeId
        });
        
        if (error) throw error;
        return data;
      }
    },
    enabled: !!disputeId,
  });
};
