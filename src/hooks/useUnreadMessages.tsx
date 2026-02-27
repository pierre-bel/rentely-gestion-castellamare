import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemoData } from "@/hooks/useDemoData";

export const useUnreadMessages = (userId: string | undefined, isAdmin: boolean = false) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { isDemoMode, getAdminSupportUnreadCount, getThreads } = useDemoData();

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCount = async () => {
      try {
        // Demo mode: Calculate from localStorage
        if (isDemoMode) {
          if (isAdmin) {
            // Admin: Use admin support threads
            const count = getAdminSupportUnreadCount();
            setUnreadCount(count);
          } else {
            // Guest/Host: Use regular threads
            const threads = getThreads(null, 'recent');
            const totalUnread = threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0);
            setUnreadCount(totalUnread);
          }
          return;
        }

        // Real mode: Use RPC calls
        const rpcFunction = isAdmin ? 'admin_get_support_conversations' : 'search_inbox_conversations';
        const params = isAdmin 
          ? { p_admin_user_id: userId, p_search_query: null, p_sort_by: 'recent' }
          : { p_user_id: userId, p_search_query: null, p_sort_by: 'recent' };

        const { data, error } = await supabase.rpc(rpcFunction, params);

        if (error) throw error;

        const totalUnread = (data || []).reduce((sum: number, thread: any) => sum + thread.unread_count, 0);
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // In demo mode, listen for storage changes to refresh unread count
    if (isDemoMode) {
      const handleStorageChange = (e: StorageEvent) => {
        // Re-fetch when demo snapshot changes
        if (e.key?.startsWith('demo_snapshot_')) {
          fetchUnreadCount();
        }
      };

      // Listen for storage events from other tabs/windows
      window.addEventListener('storage', handleStorageChange);

      // Also create a custom event for same-tab updates
      const handleCustomUpdate = () => {
        fetchUnreadCount();
      };
      window.addEventListener('demo-messages-updated', handleCustomUpdate);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('demo-messages-updated', handleCustomUpdate);
      };
    }

    // Subscribe to real-time updates (only in real mode)
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${userId}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isDemoMode, isAdmin, getAdminSupportUnreadCount, getThreads]);

  return unreadCount;
};
