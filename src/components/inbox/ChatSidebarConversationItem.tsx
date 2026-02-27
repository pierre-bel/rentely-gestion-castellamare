import { MessageThread } from "@/types/inbox";
import { format } from "date-fns";

interface ChatSidebarConversationItemProps {
  thread: MessageThread;
  isActive: boolean;
  onClick: () => void;
}

export const ChatSidebarConversationItem = ({
  thread,
  isActive,
  onClick,
}: ChatSidebarConversationItemProps) => {
  return (
    <div
      className={`p-3 cursor-pointer border border-border rounded-lg transition-all hover:shadow-sm ${
        isActive ? "bg-muted/50 border-primary" : "bg-white hover:bg-muted/20"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-foreground truncate">
              {thread.other_user_name}
            </h4>
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {format(new Date(thread.last_message_time), "MMM dd")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate mb-1">
            {thread.listing_title || "No listing"}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground truncate flex-1">
              {thread.last_message || "No messages yet"}
            </p>
            {thread.unread_count > 0 && (
              <div className="w-2 h-2 rounded-full bg-[#45CE99] shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
