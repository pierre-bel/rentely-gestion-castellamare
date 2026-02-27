import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useDemoData } from "@/hooks/useDemoData";
import { demoStorage } from "@/lib/demoStorage";

interface ContactHostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  hostId: string;
  listingTitle: string;
}

export const ContactHostDialog = ({
  open,
  onOpenChange,
  listingId,
  hostId,
  listingTitle,
}: ContactHostDialogProps) => {
  const { user } = useAuth();
  const { isDemoMode, getOrCreateThread, sendDemoMessage } = useDemoData();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!user?.id || !message.trim()) return;

    setLoading(true);
    try {
      if (isDemoMode) {
        // Demo mode: use localStorage
        // First, fetch the host profile to store it
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .eq('id', hostId)
          .single();
        
        // Get or create thread
        const threadId = getOrCreateThread(hostId, null, listingId);
        if (!threadId) throw new Error('Failed to create thread');
        
        // Store host profile
        demoStorage.storeProfile(user.id, hostId, hostProfile || {
          id: hostId,
          first_name: 'Host',
          last_name: '',
          email: null,
          avatar_url: null
        });
        
        // Send the message via demo storage
        sendDemoMessage(threadId, hostId, message.trim());
      } else {
        // Real mode: use Supabase RPC
        const { data: threadId, error: threadError } = await supabase.rpc(
          "get_or_create_thread",
          {
            p_participant_1_id: user.id,
            p_participant_2_id: hostId,
            p_listing_id: listingId,
          }
        );

        if (threadError) throw threadError;

        // Send message
        const { error: messageError } = await supabase.from("messages").insert({
          thread_id: threadId,
          from_user_id: user.id,
          to_user_id: hostId,
          body: message.trim(),
        });

        if (messageError) throw messageError;
      }

      // Success - close dialog and show toast
      onOpenChange(false);
      setMessage("");
      toast({
        title: "Message sent",
        description: "Your message has been sent. You can manage your conversations in your inbox.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Message</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Contact host about {listingTitle}
          </p>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Textarea
            placeholder="Ask the host a question about this property..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px]"
            maxLength={500}
          />
          <div className="text-sm text-muted-foreground text-right">
            {message.length}/500
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading || !message.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
