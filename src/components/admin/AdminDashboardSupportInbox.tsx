import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SUPPORT_USER_ID } from "@/types/support-inbox";
import { format } from "date-fns";
import { useDemoData } from "@/hooks/useDemoData";

interface SupportConversation {
  thread_id: string;
  user_id: string;
  user_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

const AdminDashboardSupportInbox = () => {
  const navigate = useNavigate();
  const { isDemoMode, getAdminSupportThreads } = useDemoData();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["admin-dashboard-support-inbox", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        // Demo mode: Get from localStorage
        const threads = getAdminSupportThreads(null, "last_message_time");
        return threads?.slice(0, 5) || [];
      } else {
        // Real mode: Fetch from Supabase
        const { data, error } = await supabase.rpc("admin_get_support_conversations", {
          p_search_query: null,
          p_sort_by: "last_message_time",
        });

        if (error) throw error;
        return (data as SupportConversation[])?.slice(0, 5) || [];
      }
    },
  });

  const handleThreadClick = (threadId: string) => {
    navigate(`/admin/support?thread=${threadId}`);
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

  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          No support messages right now
        </p>
        <Button variant="outline" onClick={() => navigate("/admin/support")}>
          View All Messages
        </Button>
      </div>
    );
  }

  return (
    <div className="px-3 max-h-[400px] overflow-y-auto">
      {conversations.map((conversation) => (
        <div
          key={conversation.thread_id}
          className="p-3 cursor-pointer border-b border-border transition-colors hover:bg-[#F8FAFF]"
          onClick={() => handleThreadClick(conversation.thread_id)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-foreground truncate">
                  {conversation.user_name}
                </h4>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {format(new Date(conversation.last_message_time), "MMM dd")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground truncate flex-1">
                  {conversation.last_message || "No messages yet"}
                </p>
                {conversation.unread_count > 0 && (
                  <div className="w-2 h-2 rounded-full bg-[#45CE99] shrink-0" />
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboardSupportInbox;
