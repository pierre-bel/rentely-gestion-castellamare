import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getDemoState, isDemoActive } from "@/lib/demoMode";

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle demo mode - return roles immediately without DB query
    if (isDemoActive()) {
      const demoState = getDemoState();
      if (demoState) {
        const demoRoles: Record<string, string[]> = {
          guest: ["guest"],
          host: ["host"],
          admin: ["admin", "host"],
        };
        setRoles(demoRoles[demoState.role] || []);
      }
      setLoading(false);
      return;
    }

    // CRITICAL: Wait for auth to finish loading first
    if (authLoading) {
      return;
    }

    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!error && data) {
        setRoles(data.map((r) => r.role));
      }
      setLoading(false);
    };

    fetchRoles();
  }, [user, authLoading]);

  const hasRole = (role: string) => roles.includes(role);
  const isHost = hasRole("host") || hasRole("admin");
  const isAdmin = hasRole("admin");
  const isGuest = hasRole("guest");

  const requestHostRole = async () => {
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "host" });

    if (!error) {
      setRoles([...roles, "host"]);
    }

    return { error };
  };

  return { roles, loading, hasRole, isHost, isAdmin, isGuest, requestHostRole };
};
