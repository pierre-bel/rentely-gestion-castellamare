import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface HostNote {
  id: string;
  host_user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const useHostNotes = (userId: string | undefined) => {
  const [notes, setNotes] = useState<HostNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("host_notes")
        .select("*")
        .eq("host_user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setNotes(data || []);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les notes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  const createNote = useCallback(async (title: string, content: string) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from("host_notes")
        .insert({ host_user_id: userId, title, content })
        .select()
        .single();
      if (error) throw error;
      setNotes((prev) => [data, ...prev]);
      return data;
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer la note", variant: "destructive" });
      return null;
    }
  }, [userId, toast]);

  const updateNote = useCallback(async (noteId: string, updates: { title?: string; content?: string }) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("host_notes")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .eq("host_user_id", userId);
      if (error) throw error;
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))
      );
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder la note", variant: "destructive" });
    }
  }, [userId, toast]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("host_notes")
        .delete()
        .eq("id", noteId)
        .eq("host_user_id", userId);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast({ title: "Note supprimée" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer la note", variant: "destructive" });
    }
  }, [userId, toast]);

  useEffect(() => {
    if (userId) fetchNotes();
  }, [userId, fetchNotes]);

  return { notes, loading, createNote, updateNote, deleteNote };
};
