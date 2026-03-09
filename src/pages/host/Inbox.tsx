import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { InboxControlBar } from "@/components/inbox/InboxControlBar";
import { EmailList } from "@/components/inbox/EmailList";
import { EmailDetailPanel } from "@/components/inbox/EmailDetailPanel";
import { useInbox } from "@/hooks/useInbox";
import { useInboxEmails } from "@/hooks/useInboxEmails";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Mail } from "lucide-react";

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

  const {
    emails,
    selectedEmail,
    selectedEmailId,
    selectEmail,
    loading: emailsLoading,
    searchQuery: emailSearchQuery,
    setSearchQuery: setEmailSearchQuery,
    unreadCount: emailUnreadCount,
  } = useInboxEmails(user?.id);

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

  const handleBackToEmailList = () => {
    selectEmail(null);
  };

  return (
    <div className="container mx-auto px-4 pb-8 lg:px-8">
      <div className="bg-white rounded-lg p-4 border border-border">
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails
              {emailUnreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {emailUnreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-0">
            <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[600px]">
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
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails" className="mt-0">
            <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[600px]">
              <Card className={`bg-[#F8FAFF] md:w-[400px] overflow-hidden ${selectedEmailId ? 'hidden md:block' : 'w-full'}`}>
                <CardContent className="p-0 h-full overflow-hidden">
                  <EmailList
                    emails={emails}
                    selectedEmailId={selectedEmailId}
                    onSelectEmail={selectEmail}
                    loading={emailsLoading}
                    searchQuery={emailSearchQuery}
                    setSearchQuery={setEmailSearchQuery}
                  />
                </CardContent>
              </Card>

              <Card className={`bg-white flex-1 overflow-hidden ${!selectedEmailId ? 'hidden md:block' : 'w-full'}`}>
                <CardContent className="p-0 h-full w-full flex flex-col overflow-hidden">
                  <EmailDetailPanel
                    email={selectedEmail}
                    onBack={handleBackToEmailList}
                    showBackButton={!!selectedEmailId}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HostInbox;
