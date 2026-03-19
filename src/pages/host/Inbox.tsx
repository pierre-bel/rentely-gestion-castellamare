import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { InboxControlBar } from "@/components/inbox/InboxControlBar";
import { EmailList } from "@/components/inbox/EmailList";
import { EmailDetailPanel } from "@/components/inbox/EmailDetailPanel";
import { PasteMessagePanel } from "@/components/inbox/PasteMessagePanel";
import { NotesPanel } from "@/components/inbox/NotesPanel";
import { useInbox } from "@/hooks/useInbox";
import { useInboxEmails } from "@/hooks/useInboxEmails";
import { useHostNotes } from "@/hooks/useHostNotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Mail, RefreshCw, Loader2, Link2, Unlink, StickyNote, ClipboardPaste } from "lucide-react";
import { AiReplySettingsDialog } from "@/components/inbox/AiReplySettingsDialog";
import { CreateManualBookingDialog } from "@/components/host/CreateManualBookingDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { BookingPrefillData } from "@/types/booking-prefill";

const HostInbox = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
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
    hideMessage,
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
    hideEmail,
  } = useInboxEmails(user?.id);

  const { notes, loading: notesLoading, createNote, updateNote, deleteNote } = useHostNotes(user?.id);

  const selectedThread = threads.find(t => t.thread_id === selectedThreadId);

  // Booking extraction state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState<BookingPrefillData | null>(null);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (preSelectedThreadId && threads.length > 0) {
      setSelectedThreadId(preSelectedThreadId);
    }
  }, [preSelectedThreadId, threads, setSelectedThreadId]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const fetchListingsForExtraction = async () => {
    const { data } = await supabase
      .from("listings")
      .select("id, title")
      .eq("host_user_id", user.id)
      .order("title");
    return data || [];
  };

  const extractAndOpenBooking = async (text: string) => {
    setExtracting(true);
    try {
      const listings = await fetchListingsForExtraction();
      const { data, error } = await supabase.functions.invoke("extract-booking-info", {
        body: { text, listings: listings.map(l => ({ id: l.id, title: l.title })) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const prefill: BookingPrefillData = {
        listingId: data.listing_id || undefined,
        firstName: data.first_name || undefined,
        lastName: data.last_name || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        checkinDate: data.checkin_date ? new Date(data.checkin_date) : undefined,
        checkoutDate: data.checkout_date ? new Date(data.checkout_date) : undefined,
        street: data.street || undefined,
        streetNumber: data.street_number || undefined,
        postalCode: data.postal_code || undefined,
        city: data.city || undefined,
        country: data.country || undefined,
        notes: data.notes || undefined,
      };

      setBookingPrefill(prefill);
      setBookingDialogOpen(true);
    } catch (err: any) {
      toast({
        title: "Erreur d'extraction",
        description: err?.message || "Impossible d'extraire les informations",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleEmailCreateBooking = () => {
    if (!selectedEmail) return;
    const text = selectedEmail.body_text || selectedEmail.subject || "";
    extractAndOpenBooking(text);
  };

  const handleMessageCreateBooking = () => {
    if (!messages.length) return;
    const text = messages.map(m => m.body).join("\n\n");
    extractAndOpenBooking(text);
  };

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
    <div className="container mx-auto px-2 sm:px-4 pb-8 lg:px-8">
      <div className="bg-white rounded-lg p-2 sm:p-4 border border-border">
        <Tabs defaultValue="emails" className="w-full">
          <TabsList className="mb-3 sm:mb-4 w-full sm:w-auto">
            <TabsTrigger value="emails" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2 flex-1 sm:flex-none">
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Emails
              {emailUnreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {emailUnreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2 flex-1 sm:flex-none">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2 flex-1 sm:flex-none">
              <ClipboardPaste className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Coller</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2 flex-1 sm:flex-none">
              <StickyNote className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* Emails Tab */}
          <TabsContent value="emails" className="mt-0">
            {/* Gmail toolbar */}
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
              {gmailConnected === false && (
                <Button variant="outline" size="sm" onClick={connectGmail} className="gap-1 sm:gap-1.5 text-xs sm:text-sm">
                  <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Connecter Gmail</span>
                  <span className="sm:hidden">Gmail</span>
                </Button>
              )}
              {gmailConnected && (
                <>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md truncate max-w-[140px] sm:max-w-none">
                    <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span className="truncate">{gmailEmail || "Gmail connecté"}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={syncGmail} disabled={syncing} className="gap-1 sm:gap-1.5 text-xs sm:text-sm">
                    {syncing ? <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" /> : <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                    <span className="hidden sm:inline">{syncing ? "Synchronisation…" : "Synchroniser"}</span>
                    <span className="sm:hidden">{syncing ? "Sync…" : "Sync"}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={disconnectGmail} className="gap-1 sm:gap-1.5 text-muted-foreground text-xs sm:text-sm">
                    <Unlink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Déconnecter</span>
                  </Button>
                </>
              )}
              {user && <AiReplySettingsDialog hostId={user.id} />}
            </div>

            <div className="flex gap-2 sm:gap-4 h-[calc(100vh-320px)] sm:h-[calc(100vh-310px)] min-h-[400px] sm:min-h-[600px]">
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
                    onDeleteEmail={hideEmail}
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
                    onCreateBooking={selectedEmail ? handleEmailCreateBooking : undefined}
                    extractingBooking={extracting}
                    onDeleteEmail={hideEmail}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-0">
            <div className="flex gap-2 sm:gap-4 h-[calc(100vh-260px)] min-h-[400px] sm:min-h-[600px]">
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
                    onDeleteMessage={hideMessage}
                    onCreateBooking={selectedThread ? handleMessageCreateBooking : undefined}
                    extracting={extracting}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Paste Tab */}
          <TabsContent value="paste" className="mt-0">
            <div className="h-[calc(100vh-260px)] min-h-[400px] sm:min-h-[600px]">
              <Card className="bg-white h-full overflow-auto">
                <CardContent className="p-0 h-full">
                  <PasteMessagePanel
                    hostId={user.id}
                    onCreateBooking={extractAndOpenBooking}
                    extractingBooking={extracting}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-0">
            <NotesPanel
              notes={notes}
              loading={notesLoading}
              onCreateNote={createNote}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
            />
          </TabsContent>
        </Tabs>
      </div>

      <CreateManualBookingDialog
        open={bookingDialogOpen}
        onOpenChange={(open) => {
          setBookingDialogOpen(open);
          if (!open) setBookingPrefill(null);
        }}
        prefillData={bookingPrefill}
      />
    </div>
  );
};

export default HostInbox;
