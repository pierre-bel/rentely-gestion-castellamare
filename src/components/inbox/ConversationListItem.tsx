import { MessageThread } from "@/types/inbox";
import { format } from "date-fns";

interface ConversationListItemProps {
  thread: MessageThread;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationListItem = ({
  thread,
  isActive,
  onClick
}: ConversationListItemProps) => {
  return (
    <div
      className={`p-3 cursor-pointer border-b border-border transition-colors hover:bg-[#F8FAFF] ${
        isActive ? "bg-[#F8FAFF] border-l-[3px] border-l-[#45CE99]" : ""
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
          <p className="text-sm text-[#64748B] truncate mb-1">
            {thread.listing_title || "No listing"}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-[#475569] truncate flex-1">
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
