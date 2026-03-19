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
  status: string;
  ai_draft: string | null;
  gmail_message_id: string | null;
  hidden: boolean;
}

export const useInboxEmails = (userId: string | undefined) => {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const { toast } = useToast();

  const debouncedSearch = useDebounce(searchQuery, 500);

  const checkGmailConnection = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("gmail_tokens")
        .select("gmail_email")
        .eq("host_id", userId)
        .maybeSingle();
      if (error) throw error;
      setGmailConnected(!!data);
      setGmailEmail(data?.gmail_email || null);
    } catch {
      setGmailConnected(false);
    }
  }, [userId]);

  const fetchEmails = useCallback(async () => {
    if (!userId) return;
    try {
      let query = supabase
        .from("inbox_emails")
        .select("*")
        .eq("host_id", userId)
        .eq("hidden", false)
        .order("received_at", { ascending: false });

      if (debouncedSearch) {
        query = query.or(
          `from_email.ilike.%${debouncedSearch}%,from_name.ilike.%${debouncedSearch}%,subject.ilike.%${debouncedSearch}%`
        );
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
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
  }, [userId, debouncedSearch, statusFilter, toast]);

  const markAsRead = useCallback(async (emailId: string) => {
    if (!userId) return;
    try {
      await supabase.from("inbox_emails").update({ read: true }).eq("id", emailId).eq("host_id", userId);
      setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, read: true } : e)));
    } catch (error) {
      console.error("Error marking email as read:", error);
    }
  }, [userId]);

  const updateEmailStatus = useCallback(async (emailId: string, status: string) => {
    if (!userId) return;
    try {
      await supabase.from("inbox_emails").update({ status }).eq("id", emailId).eq("host_id", userId);
      setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, status } : e)));
    } catch (error) {
      console.error("Error updating email status:", error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut", variant: "destructive" });
    }
  }, [userId, toast]);

  const updateAiDraft = useCallback(async (emailId: string, aiDraft: string) => {
    if (!userId) return;
    try {
      await supabase.from("inbox_emails").update({ ai_draft: aiDraft }).eq("id", emailId).eq("host_id", userId);
      setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, ai_draft: aiDraft } : e)));
    } catch (error) {
      console.error("Error saving AI draft:", error);
    }
  }, [userId]);

  const hideEmail = useCallback(async (emailId: string) => {
    if (!userId) return;
    try {
      await supabase.from("inbox_emails").update({ hidden: true }).eq("id", emailId).eq("host_id", userId);
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (selectedEmailId === emailId) setSelectedEmailId(null);
      toast({ title: "Email supprimé", description: "L'email a été retiré de votre boîte de réception" });
    } catch (error) {
      console.error("Error hiding email:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer l'email", variant: "destructive" });
    }
  }, [userId, selectedEmailId, toast]);

  const selectEmail = useCallback((emailId: string | null) => {
    setSelectedEmailId(emailId);
    if (emailId) markAsRead(emailId);
  }, [markAsRead]);

  const syncGmail = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-gmail-inbox");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Synchronisation terminée", description: data?.message || "Emails synchronisés" });
      await fetchEmails();
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Impossible de synchroniser Gmail", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [userId, fetchEmails, toast]);

  const connectGmail = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("gmail-oauth-start");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        const popup = window.open(data.url, "gmail-oauth", "width=500,height=700");
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === "gmail-oauth-success") {
            window.removeEventListener("message", handleMessage);
            toast({ title: "Gmail connecté", description: "Votre compte Gmail a été connecté avec succès" });
            checkGmailConnection();
          } else if (event.data?.type === "gmail-oauth-error") {
            window.removeEventListener("message", handleMessage);
            toast({ title: "Erreur", description: event.data.message, variant: "destructive" });
          }
        };
        window.addEventListener("message", handleMessage);
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Impossible de connecter Gmail", variant: "destructive" });
    }
  }, [toast, checkGmailConnection]);

  const disconnectGmail = useCallback(async () => {
    if (!userId) return;
    try {
      await supabase.from("gmail_tokens").delete().eq("host_id", userId);
      setGmailConnected(false);
      setGmailEmail(null);
      toast({ title: "Gmail déconnecté" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de déconnecter Gmail", variant: "destructive" });
    }
  }, [userId, toast]);

  const unreadCount = emails.filter((e) => !e.read).length;
  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

  useEffect(() => {
    if (userId) {
      fetchEmails();
      checkGmailConnection();
    }
  }, [userId, fetchEmails, checkGmailConnection]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("inbox-emails-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inbox_emails" }, (payload) => {
        const newEmail = payload.new as InboxEmail;
        if (newEmail.host_id === userId && !newEmail.hidden) {
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
    statusFilter,
    setStatusFilter,
    unreadCount,
    syncing,
    syncGmail,
    connectGmail,
    disconnectGmail,
    gmailConnected,
    gmailEmail,
    updateEmailStatus,
    updateAiDraft,
    hideEmail,
  };
};
