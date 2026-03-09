import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";

export interface InboxEmail {
  id: string;
  host_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  attachments: any;
  read: boolean;
  received_at: string;
  created_at: string;
}

export const useInboxEmails = (userId: string | undefined) => {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchEmails = useCallback(async () => {
    if (!userId) return;
    try {
      let query = supabase
        .from("inbox_emails")
        .select("*")
        .eq("host_id", userId)
        .order("received_at", { ascending: false });

      if (debouncedSearch) {
        query = query.or(
          `from_email.ilike.%${debouncedSearch}%,from_name.ilike.%${debouncedSearch}%,subject.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setEmails((data as InboxEmail[]) || []);
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast({ title: "Erreur", description: "Impossible de charger les emails", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, debouncedSearch, toast]);

  const markAsRead = useCallback(async (emailId: string) => {
    if (!userId) return;
    try {
      await supabase.from("inbox_emails").update({ read: true }).eq("id", emailId).eq("host_id", userId);
      setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, read: true } : e)));
    } catch (error) {
      console.error("Error marking email as read:", error);
    }
  }, [userId]);

  const selectEmail = useCallback((emailId: string | null) => {
    setSelectedEmailId(emailId);
    if (emailId) markAsRead(emailId);
  }, [markAsRead]);

  const unreadCount = emails.filter((e) => !e.read).length;
  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

  useEffect(() => {
    if (userId) fetchEmails();
  }, [userId, fetchEmails]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("inbox-emails-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inbox_emails" }, (payload) => {
        const newEmail = payload.new as InboxEmail;
        if (newEmail.host_id === userId) {
          setEmails((prev) => [newEmail, ...prev]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return {
    emails,
    selectedEmail,
    selectedEmailId,
    selectEmail,
    loading,
    searchQuery,
    setSearchQuery,
    unreadCount,
  };
};
