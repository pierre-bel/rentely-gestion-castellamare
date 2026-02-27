import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageThread, Message } from "@/types/inbox";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useDemoData } from "@/hooks/useDemoData";

export const useInbox = (userId: string | undefined) => {
  const { isDemoMode, migrationComplete, getThreads: getDemoThreads, getMessages: getDemoMessages, sendDemoMessage, markDemoMessagesAsRead } = useDemoData();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const { toast } = useToast();
  
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch threads with search and sort
  const fetchThreads = async () => {
    if (!userId) return;
    
    try {
      // Demo mode: use localStorage
      if (isDemoMode) {
        const demoThreads = getDemoThreads(debouncedSearch || null, sortBy);
        setThreads(demoThreads as MessageThread[]);
        setLoading(false);
        return;
      }
      
      // Real mode: RPC call
      const { data, error } = await supabase.rpc('search_inbox_conversations', {
        p_user_id: userId,
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
      console.error('Error fetching threads:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected thread
  const fetchMessages = async (threadId: string) => {
    setMessagesLoading(true);
    try {
      // Demo mode: use localStorage
      if (isDemoMode) {
        const demoMessages = getDemoMessages(threadId);
        setMessages(demoMessages as Message[]);
        setMessagesLoading(false);
        return;
      }
      
      // Real mode: DB query
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark messages as read
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

  // Mark thread messages as read
  const markThreadAsRead = async (threadId: string) => {
    if (!userId) return;
    
    try {
    // Demo mode: mark in localStorage
    if (isDemoMode) {
      markDemoMessagesAsRead(threadId);
      
      // Immediately update local state for instant UI feedback
      setThreads(prevThreads => 
        prevThreads.map(t => 
          t.thread_id === threadId 
            ? { ...t, unread_count: 0 }
            : t
        )
      );
      
      // Refresh threads in background to ensure consistency
      fetchThreads();
      return;
    }
      
      // Real mode: update in database
      const { data } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('thread_id', threadId)
        .eq('to_user_id', userId)
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

  // Send message
  const sendMessage = async (threadId: string, toUserId: string, body: string, attachmentUrl?: string, attachmentType?: string) => {
    if (!userId) return;

    try {
      // Demo mode: use localStorage
      if (isDemoMode) {
        const newMessage = sendDemoMessage(threadId, toUserId, body, attachmentUrl, attachmentType);
        if (newMessage) {
          setMessages(prev => [...prev, newMessage]);
          // Refresh threads to update last_message
          await fetchThreads();
        }
        return;
      }
      
      // Real mode: DB insert
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          from_user_id: userId,
          to_user_id: toUserId,
          body,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType
        });

      if (error) throw error;
      
      // Refresh threads to update last_message in conversation list
      await fetchThreads();

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  // Upload image
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!userId) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      return publicUrl;
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

  // Initial fetch and refetch on search/sort changes
  useEffect(() => {
    if (userId && (!isDemoMode || migrationComplete)) {
      fetchThreads();
    }
  }, [userId, debouncedSearch, sortBy, isDemoMode, migrationComplete]);

  // Fetch messages when thread is selected
  useEffect(() => {
    if (selectedThreadId) {
      fetchMessages(selectedThreadId);
    } else {
      setMessages([]);
    }
  }, [selectedThreadId]);

  // Real-time subscription for threads
  useEffect(() => {
    if (!userId) return;

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
      .channel('inbox-threads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_threads'
        },
        () => fetchThreads()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(threadChannel);
    };
  }, [userId, debouncedSearch, sortBy, isDemoMode]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedThreadId || isDemoMode) return; // Skip real-time in demo mode

    const messageChannel = supabase
      .channel('inbox-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${selectedThreadId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          if ((payload.new as Message).to_user_id === userId) {
            markThreadAsRead(selectedThreadId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [selectedThreadId, userId, isDemoMode]);

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
