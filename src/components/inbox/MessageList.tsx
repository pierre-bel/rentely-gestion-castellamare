import { useEffect, useRef, useState } from "react";
import { Message } from "@/types/inbox";
import { MessageBubble } from "./MessageBubble";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  onDeleteMessage?: (messageId: string) => void;
}

export const MessageList = ({
  messages,
  currentUserId,
  loading,
  onDeleteMessage
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Handle initial load scroll
  useEffect(() => {
    if (!loading && messages.length > 0 && isInitialLoad) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        scrollToBottom("auto");
        setIsInitialLoad(false);
        prevMessagesLengthRef.current = messages.length;
      }, 100);
    }
  }, [loading, messages.length, isInitialLoad]);

  // Handle new messages arriving
  useEffect(() => {
    if (!isInitialLoad && messages.length > prevMessagesLengthRef.current) {
      scrollToBottom("smooth");
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages, isInitialLoad]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[70%] space-y-2">
              <Skeleton className="h-16 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-white">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOutgoing={message.from_user_id === currentUserId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
