import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBookingDispute = (bookingId: string | null) => {
  const [dispute, setDispute] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const fetchDispute = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("disputes")
          .select("id, status, support_thread_id")
          .eq("booking_id", bookingId)
          .eq("initiated_by_user_id", user.id)
          .in("status", ["open", "in_progress", "escalated"])
          .maybeSingle();

        if (!error && data) {
          setDispute(data);
        } else {
          setDispute(null);
        }
      } catch (error) {
        console.error("Error fetching dispute:", error);
        setDispute(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDispute();
  }, [bookingId]);

  return { dispute, loading };
};
