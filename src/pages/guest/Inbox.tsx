import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { InboxControlBar } from "@/components/inbox/InboxControlBar";
import { useInbox } from "@/hooks/useInbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useDemoData } from "@/hooks/useDemoData";

const GuestInbox = () => {
  const { user } = useAuth();
  const location = useLocation();
  const preSelectedThreadId = location.state?.threadId;
  const { isDemoMode, migrationComplete } = useDemoData();
  const hasProcessedPreselection = useRef(false);
  
  const {
    threads,
    selectedThreadId,
    setSelectedThreadId,
    messages,
    loading,
    messagesLoading,
    sendMessage,
    uploadImage,
    fetchThreads,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy
  } = useInbox(user?.id);

  const selectedThread = threads.find(t => t.thread_id === selectedThreadId);

  // Pre-select thread if navigated with threadId in state (only once)
  useEffect(() => {
    if (preSelectedThreadId && !hasProcessedPreselection.current) {
      // In demo mode, manually refresh threads to ensure new thread is loaded
      if (isDemoMode) {
        fetchThreads();
      }
      // Wait for threads to load, then select the thread
      if (threads.length > 0) {
        setSelectedThreadId(preSelectedThreadId);
        hasProcessedPreselection.current = true;
      }
    }
  }, [preSelectedThreadId, threads.length, setSelectedThreadId, isDemoMode, fetchThreads]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (isDemoMode && !migrationComplete) {
    return (
      <div className="container mx-auto px-4 pb-8 lg:px-8">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading your conversations...</p>
          </div>
        </Card>
      </div>
    );
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

export default GuestInbox;
