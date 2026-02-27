import { MessageThread } from "@/types/inbox";
import { ConversationListItem } from "./ConversationListItem";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

interface ConversationListProps {
  threads: MessageThread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  loading: boolean;
}

export const ConversationList = ({
  threads,
  selectedThreadId,
  onSelectThread,
  loading
}: ConversationListProps) => {
  if (loading) {
    return (
      <div className="p-4 space-y-2 h-full">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No conversations</h3>
        <p className="text-sm text-muted-foreground text-center">
          Your messages will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {threads.map((thread) => (
        <ConversationListItem
          key={thread.thread_id}
          thread={thread}
          isActive={selectedThreadId === thread.thread_id}
          onClick={() => onSelectThread(thread.thread_id)}
        />
      ))}
    </div>
  );
};
