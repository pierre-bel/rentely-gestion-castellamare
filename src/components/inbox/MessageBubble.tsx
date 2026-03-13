import { useState } from "react";
import { Message } from "@/types/inbox";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
  onDelete?: (messageId: string) => void;
}

export const MessageBubble = ({ message, isOutgoing, onDelete }: MessageBubbleProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className={`group flex mb-4 ${isOutgoing ? "justify-end" : "justify-start"}`}>
        {isOutgoing && onDelete && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-2 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <div
          className={`max-w-[70%] ${
            isOutgoing
              ? "bg-[#F8FAFF] border border-border rounded-2xl rounded-br-md"
              : "bg-background border border-border rounded-2xl rounded-bl-md"
          } p-3`}
        >
          {message.attachment_url && message.attachment_type?.startsWith('image/') && (
            <img
              src={message.attachment_url}
              alt="Attachment"
              className="w-full max-w-full rounded-lg mb-2 object-cover"
            />
          )}
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {message.body}
          </p>
          <p className={`text-xs mt-1 ${isOutgoing ? "text-[#64748B]" : "text-muted-foreground"}`}>
            {format(new Date(message.created_at), "h:mm a")}
          </p>
        </div>
        {!isOutgoing && onDelete && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-2 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le message sera masqué de votre vue. Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete?.(message.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
