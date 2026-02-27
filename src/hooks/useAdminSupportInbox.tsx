import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "./useDebounce";
import { useToast } from "@/hooks/use-toast";
import { SupportThread, SUPPORT_USER_ID } from "@/types/support-inbox";
import { Message } from "@/types/inbox";
import { useDemoData } from "@/hooks/useDemoData";

export const useAdminSupportInbox = (adminUserId: string | undefined) => {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const { toast } = useToast();
  const { isDemoMode, getAdminSupportThreads, getAdminSupportMessages, sendAdminSupportMessage, markAdminSupportThreadAsRead } = useDemoData();
  
  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchThreads = async () => {
    if (!adminUserId) return;
    
    try {
      if (isDemoMode) {
        setThreads(getAdminSupportThreads(debouncedSearch, sortBy));
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.rpc('admin_get_support_conversations', {
        p_admin_user_id: adminUserId,
        p_search_query: debouncedSearch || null,
        p_sort_by: sortBy
      });

      if (error) throw error;
      
      // Fetch lock status for each thread
      const threadsWithLockStatus = await Promise.all(
        (data || []).map(async (thread) => {
          const { data: threadData } = await supabase
            .from('message_threads')
            .select('is_locked, locked_at, locked_reason')
            .eq('id', thread.thread_id)
            .single();
          
          return {
            ...thread,
            is_locked: threadData?.is_locked || false,
            locked_at: threadData?.locked_at,
            locked_reason: threadData?.locked_reason
          };
        })
      );
      
      setThreads(threadsWithLockStatus);
    } catch (error) {
      console.error('Error fetching support threads:', error);
      toast({
        title: "Error",
        description: "Failed to load support conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    setMessagesLoading(true);
    try {
      if (isDemoMode) {
        setMessages(getAdminSupportMessages(threadId));
        
        // Mark messages as read in demo mode
        markAdminSupportThreadAsRead(threadId);
        
        // Update local thread state to clear unread count
        setThreads(prev => prev.map(thread => 
          thread.thread_id === threadId 
            ? { ...thread, unread_count: 0 }
            : thread
        ));
        
        setMessagesLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read for admins
      await markThreadAsRead(threadId);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setMessagesLoading(false);
    }
  };

  const markThreadAsRead = async (threadId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('thread_id', threadId)
        .eq('to_user_id', SUPPORT_USER_ID)
        .eq('read', false)
        .select('id');

      // Update local state to decrement unread count
      if (data && data.length > 0) {
        setThreads(prev => prev.map(thread => 
          thread.thread_id === threadId 
            ? { ...thread, unread_count: 0 }
            : thread
        ));
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (
    threadId: string,
    toUserId: string,
    body: string,
    attachmentUrl?: string,
    attachmentType?: string
  ) => {
    if (!adminUserId) return;
    
    try {
      if (isDemoMode) {
        const msg = sendAdminSupportMessage(threadId, toUserId, body);
        if (msg) {
          setMessages(prev => [...prev, msg]);
          
          // Update the thread's last_message and last_message_time in UI
          setThreads(prev => prev.map(thread => 
            thread.thread_id === threadId
              ? {
                  ...thread,
                  last_message: body,
                  last_message_time: msg.created_at
                }
              : thread
          ));
        }
        return;
      }
      
      const { error } = await supabase.from('messages').insert({
        thread_id: threadId,
        from_user_id: adminUserId,
        to_user_id: toUserId,
        body,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        read: false,
      });

      if (error) throw error;

      // Real-time subscription will handle updating the messages
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `message-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
      return null;
    }
  };

  // Fetch threads when dependencies change
  useEffect(() => {
    if (adminUserId) {
      fetchThreads();
    }
  }, [adminUserId, debouncedSearch, sortBy]);

  // Fetch messages when thread is selected
  useEffect(() => {
    if (selectedThreadId) {
      fetchMessages(selectedThreadId);
    } else {
      setMessages([]);
    }
  }, [selectedThreadId]);

  // Real-time updates for support threads
  useEffect(() => {
    if (!adminUserId) return;

    // In demo mode, listen for message updates
    if (isDemoMode) {
      const handleDemoUpdate = () => {
        fetchThreads();
      };
      window.addEventListener('demo-messages-updated', handleDemoUpdate);

      return () => {
        window.removeEventListener('demo-messages-updated', handleDemoUpdate);
      };
    }

    // Real mode: Supabase real-time
    const threadChannel = supabase
      .channel('admin-support-threads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_threads',
          filter: `thread_type=eq.user_to_support`
        },
        () => fetchThreads()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(threadChannel);
    };
  }, [adminUserId, debouncedSearch, sortBy, isDemoMode]);

  // Real-time updates for messages in selected thread
  useEffect(() => {
    if (!selectedThreadId) return;

    const messageChannel = supabase
      .channel(`admin-support-messages-${selectedThreadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${selectedThreadId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if it's for the admin
          if (newMessage.to_user_id === SUPPORT_USER_ID) {
            markThreadAsRead(selectedThreadId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [selectedThreadId]);

  return {
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
  };
};
