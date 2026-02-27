import { Message } from "@/types/inbox";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
}

export const MessageBubble = ({ message, isOutgoing }: MessageBubbleProps) => {
  return (
    <div className={`flex mb-4 ${isOutgoing ? "justify-end" : "justify-start"}`}>
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
    </div>
  );
};
