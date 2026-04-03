import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useHostNotes } from "@/hooks/useHostNotes";
import { NotesPanel } from "@/components/inbox/NotesPanel";

const HostNotes = () => {
  const { user } = useAuth();
  const { notes, loading, createNote, updateNote, deleteNote } = useHostNotes(user?.id);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 pb-8 lg:px-8">
      <NotesPanel
        notes={notes}
        loading={loading}
        onCreateNote={createNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
      />
    </div>
  );
};

export default HostNotes;
