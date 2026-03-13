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
import { ArrowLeft, MessageSquare, Mail, RefreshCw, Loader2, Link2, Unlink } from "lucide-react";

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
    statusFilter,
    setStatusFilter,
    unreadCount: emailUnreadCount,
    syncing,
    syncGmail,
    connectGmail,
    disconnectGmail,
    gmailConnected,
    gmailEmail,
    updateEmailStatus,
    updateAiDraft,
  } = useInboxEmails(user?.id);

  const selectedThread = threads.find(t => t.thread_id === selectedThreadId);

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
        <Tabs defaultValue="emails" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="emails" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails
              {emailUnreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {emailUnreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Emails Tab */}
          <TabsContent value="emails" className="mt-0">
            {/* Gmail toolbar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {gmailConnected === false && (
                <Button variant="outline" size="sm" onClick={connectGmail} className="gap-1.5">
                  <Link2 className="h-4 w-4" />
                  Connecter Gmail
                </Button>
              )}
              {gmailConnected && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md">
                    <Mail className="h-3.5 w-3.5" />
                    {gmailEmail || "Gmail connecté"}
                  </div>
                  <Button variant="outline" size="sm" onClick={syncGmail} disabled={syncing} className="gap-1.5">
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {syncing ? "Synchronisation…" : "Synchroniser"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={disconnectGmail} className="gap-1.5 text-muted-foreground">
                    <Unlink className="h-3.5 w-3.5" />
                    Déconnecter
                  </Button>
                </>
              )}
            </div>

            <div className="flex gap-4 h-[calc(100vh-310px)] min-h-[600px]">
              <Card className={`bg-[#F8FAFF] md:w-[400px] overflow-hidden ${selectedEmailId ? 'hidden md:block' : 'w-full'}`}>
                <CardContent className="p-0 h-full overflow-hidden">
                  <EmailList
                    emails={emails}
                    selectedEmailId={selectedEmailId}
                    onSelectEmail={selectEmail}
                    loading={emailsLoading}
                    searchQuery={emailSearchQuery}
                    setSearchQuery={setEmailSearchQuery}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                  />
                </CardContent>
              </Card>

              <Card className={`bg-white flex-1 overflow-hidden ${!selectedEmailId ? 'hidden md:block' : 'w-full'}`}>
                <CardContent className="p-0 h-full w-full flex flex-col overflow-hidden">
                  <EmailDetailPanel
                    email={selectedEmail}
                    onBack={handleBackToEmailList}
                    showBackButton={!!selectedEmailId}
                    onStatusChange={updateEmailStatus}
                    onDraftSave={updateAiDraft}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
        </Tabs>
      </div>
    </div>
  );
};

export default HostInbox;
