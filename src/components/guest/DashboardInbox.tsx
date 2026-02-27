import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";

interface DashboardInboxProps {
  userId: string;
}

const DashboardInbox = ({ userId }: DashboardInboxProps) => {
  const navigate = useNavigate();
  const { isDemoMode, migrationComplete, getThreads } = useDemoData();

  const { data: unreadThreads, isLoading } = useQuery({
    queryKey: ["dashboard-unread-threads", userId, isDemoMode, migrationComplete],
    queryFn: async () => {
      // Demo mode: use localStorage
      if (isDemoMode) {
        if (!migrationComplete) {
          return [];
        }
        const allThreads = getThreads(null, 'recent');
        // Filter to only unread threads
        return allThreads.filter(t => t.unread_count > 0);
      }
      
      // Real mode: RPC call
      const { data, error } = await supabase.rpc(
        "get_unread_inbox_conversations",
        { p_user_id: userId }
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !isDemoMode || migrationComplete,
  });

  const handleThreadClick = (threadId: string) => {
    navigate("/guest/inbox", { state: { threadId } });
  };

  if (isLoading) {
    return (
      <div className="px-3 pb-6">
        <div className="max-h-[400px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!unreadThreads || unreadThreads.length === 0) {
    return (
      <div className="px-3 pb-6">
        <div className="max-h-[400px] flex flex-col items-center justify-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            You have no unread messages right now
          </p>
          <Button variant="outline" onClick={() => navigate("/guest/inbox")}>
            View All Messages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-6">
      <div className="max-h-[400px] overflow-y-auto">
        {unreadThreads.map((thread: any) => (
          <div
            key={thread.thread_id}
            className="p-3 cursor-pointer border-b hover:bg-[#F8FAFF] transition-colors"
            onClick={() => handleThreadClick(thread.thread_id)}
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-foreground truncate">
                {thread.other_user_name}
              </h4>
              <span className="text-xs text-muted-foreground">
                {format(new Date(thread.last_message_time), "MMM dd")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate mb-1">
              {thread.listing_title || "No listing"}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground truncate flex-1">
                {thread.last_message || "No messages yet"}
              </p>
              {thread.unread_count > 0 && (
                <div className="w-2 h-2 rounded-full bg-[#45CE99] shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardInbox;
