import { useState } from "react";
import { HostNote } from "@/hooks/useHostNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, StickyNote, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect, useRef } from "react";

interface NotesPanelProps {
  notes: HostNote[];
  loading: boolean;
  onCreateNote: (title: string, content: string) => Promise<any>;
  onUpdateNote: (noteId: string, updates: { title?: string; content?: string }) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export const NotesPanel = ({ notes, loading, onCreateNote, onUpdateNote, onDeleteNote }: NotesPanelProps) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [creating, setCreating] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  const handleSelectNote = (note: HostNote) => {
    setSelectedNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const handleCreateNote = async () => {
    setCreating(true);
    const note = await onCreateNote("Nouvelle note", "");
    if (note) {
      setSelectedNoteId(note.id);
      setEditTitle(note.title);
      setEditContent(note.content);
    }
    setCreating(false);
  };

  const handleTitleChange = (val: string) => {
    setEditTitle(val);
    if (selectedNoteId) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onUpdateNote(selectedNoteId, { title: val });
      }, 800);
    }
  };

  const handleContentChange = (val: string) => {
    setEditContent(val);
    if (selectedNoteId) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onUpdateNote(selectedNoteId, { content: val });
      }, 800);
    }
  };

  const handleDelete = async () => {
    if (!selectedNoteId) return;
    await onDeleteNote(selectedNoteId);
    setSelectedNoteId(null);
    setEditTitle("");
    setEditContent("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-2 sm:gap-4 h-[calc(100vh-260px)] min-h-[400px] sm:min-h-[600px]">
      {/* Notes list */}
      <Card className={`bg-[#F8FAFF] md:w-[300px] overflow-hidden flex flex-col ${selectedNoteId ? 'hidden md:flex' : 'w-full flex'}`}>
        <div className="p-3 border-b border-border">
          <Button onClick={handleCreateNote} disabled={creating} className="w-full gap-1.5 text-xs sm:text-sm" size="sm">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Nouvelle note
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground text-center">Aucune note</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`p-3 cursor-pointer border-b border-border transition-colors hover:bg-background ${
                  selectedNoteId === note.id ? "bg-background border-l-[3px] border-l-primary" : ""
                }`}
                onClick={() => handleSelectNote(note)}
              >
                <h4 className="font-medium text-sm text-foreground truncate">
                  {note.title || "Sans titre"}
                </h4>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {note.content?.substring(0, 60) || "Vide"}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(note.updated_at), "dd MMM yyyy", { locale: fr })}
                </span>
              </div>
            ))
          )}
        </ScrollArea>
      </Card>

      {/* Note editor */}
      <Card className={`bg-white flex-1 overflow-hidden flex flex-col ${!selectedNoteId ? 'hidden md:flex' : 'w-full flex'}`}>
        {selectedNote ? (
          <div className="flex flex-col h-full">
            <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setSelectedNoteId(null)}
              >
                <StickyNote className="h-4 w-4" />
              </Button>
              <Input
                value={editTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-sm sm:text-base font-semibold border-none shadow-none px-0 focus-visible:ring-0"
                placeholder="Titre de la note"
              />
              <Button variant="ghost" size="icon" onClick={handleDelete} className="shrink-0 text-destructive hover:text-destructive h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="flex-1 resize-none border-none shadow-none focus-visible:ring-0 text-sm rounded-none"
              placeholder="Écrivez votre note ici..."
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <StickyNote className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Sélectionnez une note</h3>
            <p className="text-sm text-muted-foreground">Choisissez ou créez une note</p>
          </div>
        )}
      </Card>
    </div>
  );
};
