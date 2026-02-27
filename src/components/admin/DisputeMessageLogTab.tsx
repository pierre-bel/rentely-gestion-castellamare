import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { MessageList } from "@/components/inbox/MessageList";
import { SUPPORT_USER_ID } from "@/types/support-inbox";
import { useNavigate } from "react-router-dom";
import { Message } from "@/types/inbox";

interface DisputeMessageLogTabProps {
  threadId: string | null;
}

export const DisputeMessageLogTab = ({ threadId }: DisputeMessageLogTabProps) => {
  const navigate = useNavigate();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["dispute-messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      return (data || []) as Message[];
    },
    enabled: !!threadId,
  });

  const handleOpenChat = () => {
    if (threadId) {
      navigate(`/admin/support?thread=${threadId}`);
    }
  };

  if (!threadId) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No support conversation available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col min-h-0">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="text-sm font-medium">Message History</div>
        <Button onClick={handleOpenChat} variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Open Chat
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <MessageList
          messages={messages}
          currentUserId={SUPPORT_USER_ID}
          loading={isLoading}
        />
      </div>
    </Card>
  );
};
