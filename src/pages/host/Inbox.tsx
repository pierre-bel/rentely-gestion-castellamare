import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { InboxControlBar } from "@/components/inbox/InboxControlBar";
import { useInbox } from "@/hooks/useInbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const HostInbox = () => {
  const { user } = useAuth();
  const location = useLocation();
  const preSelectedThreadId = location.state?.threadId;
  
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
  } = useInbox(user?.id);

  const selectedThread = threads.find(t => t.thread_id === selectedThreadId);

  // Pre-select thread if navigated with threadId in state
  useEffect(() => {
    if (preSelectedThreadId && threads.length > 0) {
      setSelectedThreadId(preSelectedThreadId);
    }
  }, [preSelectedThreadId, threads, setSelectedThreadId]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  const handleBackToList = () => {
    setSelectedThreadId(null);
  };

  return (
    <div className="container mx-auto px-4 pb-8 lg:px-8">
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
                  threads={threads}
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
                currentUserId={user.id}
                messagesLoading={messagesLoading}
                onSendMessage={sendMessage}
                onUploadImage={uploadImage}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostInbox;
