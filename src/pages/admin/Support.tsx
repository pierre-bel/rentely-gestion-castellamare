import { useAuth } from "@/hooks/useAuth";
import { useAdminSupportInbox } from "@/hooks/useAdminSupportInbox";
import { Card, CardContent } from "@/components/ui/card";
import { InboxControlBar } from "@/components/inbox/InboxControlBar";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { MessageThread } from "@/types/inbox";
import { SUPPORT_USER_ID } from "@/types/support-inbox";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function AdminSupport() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const {
    threads,
    selectedThreadId,
    setSelectedThreadId,
    messages,
    loading,
    messagesLoading,
    sendMessage,
    uploadImage,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy
  } = useAdminSupportInbox(user?.id);

  // Handle thread query parameter from dispute resolution
  useEffect(() => {
    const threadParam = searchParams.get('thread');
    if (threadParam) {
      setSelectedThreadId(threadParam);
    }
  }, [searchParams, setSelectedThreadId]);

  // Map support thread to MessageThread format for component compatibility
  const mappedThreads: MessageThread[] = threads.map(thread => ({
    thread_id: thread.thread_id,
    other_user_id: thread.user_id,
    other_user_name: thread.user_name,
    listing_title: "Support Conversation",
    listing_address: thread.user_email,
    last_message: thread.last_message,
    last_message_time: thread.last_message_time,
    unread_count: thread.unread_count,
    booking_id: null
  }));

  const selectedThread = mappedThreads.find(t => t.thread_id === selectedThreadId);

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  const handleBackToList = () => {
    setSelectedThreadId(null);
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-border">
      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Left Card - Conversation List */}
        <Card className={`bg-[#F8FAFF] md:w-[400px] overflow-hidden ${selectedThreadId ? 'hidden md:block' : 'w-full'}`}>
          <CardContent className="p-0 h-full overflow-hidden flex flex-col">
            <InboxControlBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
            <div className="flex-1 overflow-hidden">
              <ConversationList
                threads={mappedThreads}
                selectedThreadId={selectedThreadId}
                onSelectThread={handleSelectThread}
                loading={loading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Card - Chat Panel */}
        <Card className={`bg-white flex-1 overflow-hidden ${!selectedThreadId ? 'hidden md:block' : 'w-full'}`}>
          <CardContent className="p-0 h-full w-full flex flex-col relative overflow-hidden">
            {selectedThreadId && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden absolute top-4 left-4 z-20"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <ChatPanel
              thread={selectedThread || null}
              messages={messages}
              currentUserId={SUPPORT_USER_ID}
              messagesLoading={messagesLoading}
              onSendMessage={sendMessage}
              onUploadImage={uploadImage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
