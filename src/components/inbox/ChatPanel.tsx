import { MessageThread, Message } from "@/types/inbox";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
import { MessageSquare } from "lucide-react";

interface ChatPanelProps {
  thread: MessageThread | null;
  messages: Message[];
  currentUserId: string;
  messagesLoading: boolean;
  onSendMessage: (threadId: string, toUserId: string, body: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export const ChatPanel = ({
  thread,
  messages,
  currentUserId,
  messagesLoading,
  onSendMessage,
  onUploadImage
}: ChatPanelProps) => {
  if (!thread) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <MessageSquare className="h-16 w-16 text-[#94A3B8] mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Select a conversation</h3>
        <p className="text-sm text-[#64748B]">
          Choose a conversation from the list to start messaging
        </p>
      </div>
    );
  }

  const handleSend = async (body: string, attachmentUrl?: string, attachmentType?: string) => {
    await onSendMessage(thread.thread_id, thread.other_user_id, body, attachmentUrl, attachmentType);
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        userName={thread.other_user_name}
        listingTitle={thread.listing_title}
        listingAddress={thread.listing_address}
      />
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        loading={messagesLoading}
      />
      <MessageInput
        onSendMessage={handleSend}
        onUploadImage={onUploadImage}
        isLocked={thread.is_locked}
        lockedReason={thread.locked_reason}
      />
    </div>
  );
};
