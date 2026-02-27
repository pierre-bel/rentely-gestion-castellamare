import { useState } from "react";
import { ArrowLeft, MessageSquare, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInbox } from "@/hooks/useInbox";
import { useAdminSupportInbox } from "@/hooks/useAdminSupportInbox";
import { MessageThread } from "@/types/inbox";
import { ChatSidebarConversationItem } from "./ChatSidebarConversationItem";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ChatSidebarProps {
  trigger: React.ReactNode;
  userRole?: 'guest' | 'host' | 'admin';
}

export const ChatSidebar = ({ trigger, userRole = 'guest' }: ChatSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = userRole === 'admin';

  // Guard: Don't render hooks if user is not loaded yet
  if (!user) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="w-[450px] sm:w-[640px] p-0">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Use appropriate hook based on role
  const guestHostInbox = useInbox(isAdmin ? undefined : user.id);
  const adminInbox = useAdminSupportInbox(isAdmin ? user.id : undefined);

  // Select the appropriate hook data
  const {
    threads: rawThreads,
    selectedThreadId,
    setSelectedThreadId,
    messages,
    loading,
    messagesLoading,
    searchQuery,
    sortBy,
    setSearchQuery,
    setSortBy,
    sendMessage,
    uploadImage,
  } = isAdmin ? adminInbox : guestHostInbox;

  // Map support threads to MessageThread format for admin
  const threads: MessageThread[] = isAdmin 
    ? (rawThreads as any[]).map(thread => ({
        thread_id: thread.thread_id,
        other_user_id: thread.user_id,
        other_user_name: thread.user_name,
        listing_title: "Support Conversation",
        listing_address: thread.user_email,
        last_message: thread.last_message,
        last_message_time: thread.last_message_time,
        unread_count: thread.unread_count,
        booking_id: null,
        is_locked: thread.is_locked,
        locked_reason: thread.locked_reason
      }))
    : rawThreads as MessageThread[];

  const selectedThread = threads.find((t) => t.thread_id === selectedThreadId);

  const handleBackToList = () => {
    setSelectedThreadId(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-[450px] sm:w-[640px] p-0">
        <div className="flex flex-col h-full bg-background">
          {!selectedThread ? (
            <>
              {/* Conversation List Header */}
              <div className="border-b border-border p-4 bg-background">
                <h2 className="text-xl font-semibold text-foreground mb-4">Messages</h2>
                <div className="flex items-center gap-4">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Sort Dropdown */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="recent">New to Old</SelectItem>
                      <SelectItem value="oldest">Old to New</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="p-3 space-y-2 border border-border rounded-lg">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                ) : threads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No conversations</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Your messages will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {threads.map((thread) => (
                      <ChatSidebarConversationItem
                        key={thread.thread_id}
                        thread={thread}
                        isActive={selectedThreadId === thread.thread_id}
                        onClick={() => setSelectedThreadId(thread.thread_id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Back Button Header */}
              <div className="border-b border-border p-4 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {selectedThread.other_user_name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedThread.listing_title || "No listing"}
                  </p>
                </div>
              </div>

              {/* Messages and Input */}
              <MessageList
                messages={messages}
                currentUserId={user?.id || ""}
                loading={messagesLoading}
              />
              <MessageInput
                onSendMessage={async (body, attachmentUrl, attachmentType) => {
                  await sendMessage(selectedThread.thread_id, selectedThread.other_user_id, body, attachmentUrl, attachmentType);
                }}
                onUploadImage={uploadImage}
                isLocked={selectedThread.is_locked}
                lockedReason={selectedThread.locked_reason}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
