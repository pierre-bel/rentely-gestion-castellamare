import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DashboardInboxListItem } from "./DashboardInboxListItem";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";

interface DashboardInboxProps {
  userId: string;
}

const DashboardInbox = ({ userId }: DashboardInboxProps) => {
  const navigate = useNavigate();
  const { isDemoMode, migrationComplete, getThreads: getDemoThreads } = useDemoData();

  const { data: unreadThreads, isLoading } = useQuery({
    queryKey: ["dashboard-unread-threads", userId, isDemoMode, migrationComplete],
    queryFn: async () => {
      // Demo mode: use localStorage
      if (isDemoMode) {
        if (!migrationComplete) {
          return [];
        }
        const allThreads = getDemoThreads(null, 'recent');
        // Filter to only unread threads
        return allThreads.filter(t => t.unread_count > 0);
      }
      
      // Real mode: RPC call
      const { data, error } = await supabase.rpc(
        "get_unread_inbox_conversations",
        {
          p_user_id: userId,
        }
      );

      if (error) throw error;
      return data || [];
    },
    enabled: !isDemoMode || migrationComplete,
  });

  const handleThreadClick = (threadId: string) => {
    navigate("/host/inbox", { state: { threadId } });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!unreadThreads || unreadThreads.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          You have no unread messages right now
        </p>
        <Button variant="outline" onClick={() => navigate("/host/inbox")}>
          View All Messages
        </Button>
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {unreadThreads.map((thread) => (
        <DashboardInboxListItem
          key={thread.thread_id}
          thread={thread}
          onClick={() => handleThreadClick(thread.thread_id)}
        />
      ))}
    </div>
  );
};

export default DashboardInbox;
