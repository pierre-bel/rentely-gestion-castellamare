import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AccessLevel = "full_access" | "read_only" | "read_only_anonymous" | "accounting_only";

interface TeamMembership {
  host_user_id: string;
  access_level: AccessLevel;
  host_email: string;
  host_first_name: string | null;
  host_last_name: string | null;
}

export const useTeamAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHostId, setActiveHostId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      const { data, error } = await supabase.rpc("get_my_team_memberships");
      if (!error && data) {
        setMemberships(data as TeamMembership[]);
      }
      setLoading(false);
    };

    fetchMemberships();
  }, [user, authLoading]);

  const isTeamMember = memberships.length > 0;
  
  const activeMembership = activeHostId
    ? memberships.find((m) => m.host_user_id === activeHostId)
    : null;

  const canWrite = activeMembership?.access_level === "full_access";
  const canReadTenants = activeMembership?.access_level !== "read_only_anonymous";
  const isAccountingOnly = activeMembership?.access_level === "accounting_only";

  return {
    memberships,
    loading,
    isTeamMember,
    activeHostId,
    setActiveHostId,
    activeMembership,
    canWrite,
    canReadTenants,
    isAccountingOnly,
  };
};
