import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDemoData } from "@/hooks/useDemoData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { SUPPORT_USER_ID } from "@/types/support-inbox";
import { demoStorage } from "@/lib/demoStorage";

interface AdminContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: {
    userId: string;
    userName: string;
    bookingId: string;
    listingId: string;
    listingTitle: string;
    type: 'host' | 'guest';
  } | null;
}

export default function AdminContactDialog({ open, onOpenChange, target }: AdminContactDialogProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isDemoMode, migrationComplete, getOrCreateThread, sendDemoMessage, storeProfile } = useDemoData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!message.trim() || !target || !user) return;

    setLoading(true);

    try {
      if (isDemoMode) {
        // Check if migration is complete
        if (!migrationComplete) {
          toast({
            title: "Please wait",
            description: "Demo data is still loading. Please try again in a moment.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Validate demo mode setup
        if (!user?.id) {
          toast({
            title: "Error",
            description: "User ID not found",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        // Demo mode: Create admin support thread directly in localStorage
        
        // Fetch target user profile from real DB
        const { data: targetProfile } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, avatar_url")
          .eq("id", target.userId)
          .single();

        if (targetProfile) {
          storeProfile(targetProfile.id, targetProfile);
        }
        
        // Get demo snapshot using demoStorage utility
        const demoUserId = user.id;
        const snapshot = demoStorage.getSnapshot(demoUserId);
        
        // Initialize admin support arrays if they don't exist
        if (!snapshot.adminSupportThreads) {
          snapshot.adminSupportThreads = [];
        }
        if (!snapshot.adminSupportMessages) {
          snapshot.adminSupportMessages = [];
        }
        
        // Find or create admin support thread (match by user_id and booking_id for consistency with real mode)
        let thread = snapshot.adminSupportThreads?.find(
          (t: any) => t.user_id === target.userId && t.booking_id === target.bookingId
        );
        
        let threadId: string;
        if (!thread) {
          // Create new admin support thread
          threadId = crypto.randomUUID();
          const newThread = {
            thread_id: threadId,
            user_id: target.userId,
            booking_id: target.bookingId,
            user_name: target.userName,
            user_email: targetProfile?.email || '',
            user_avatar: targetProfile?.avatar_url || null,
            last_message: message.trim(),
            last_message_time: new Date().toISOString(),
            unread_count: 0,
            is_locked: false
          };
          
          if (!snapshot.adminSupportThreads) {
            snapshot.adminSupportThreads = [];
          }
          snapshot.adminSupportThreads.unshift(newThread);
        } else {
          threadId = thread.thread_id;
          // Update existing thread
          thread.last_message = message.trim();
          thread.last_message_time = new Date().toISOString();
        }
        
        // Add message to adminSupportMessages
        const newMessage = {
          id: crypto.randomUUID(),
          thread_id: threadId,
          from_user_id: SUPPORT_USER_ID,
          to_user_id: target.userId,
          body: message.trim(),
          attachment_url: null,
          attachment_type: null,
          read: false,
          created_at: new Date().toISOString()
        };
        
        if (!snapshot.adminSupportMessages) {
          snapshot.adminSupportMessages = [];
        }
        snapshot.adminSupportMessages.push(newMessage);
        
        // Save updated snapshot using demoStorage utility
        demoStorage.saveSnapshot(demoUserId, snapshot);

        setMessage("");
        onOpenChange(false);
        
        // Navigate to support inbox with thread selected
        navigate(`/admin/support?thread=${threadId}`);
      } else {
        // Real mode: Create support thread directly (fixes RLS error)
        
        // Step 1: Find existing support thread or create new one
        const { data: existingThreads } = await supabase
          .from("message_threads")
          .select("id")
          .eq("thread_type", "user_to_support")
          .eq("booking_id", target.bookingId)
          .or(`and(participant_1_id.eq.${SUPPORT_USER_ID},participant_2_id.eq.${target.userId}),and(participant_1_id.eq.${target.userId},participant_2_id.eq.${SUPPORT_USER_ID})`);

        let threadId: string;
        if (existingThreads && existingThreads.length > 0) {
          threadId = existingThreads[0].id;
        } else {
          // Create new support thread with thread_type = 'user_to_support'
          const { data: newThread, error: threadError } = await supabase
            .from("message_threads")
            .insert({
              participant_1_id: SUPPORT_USER_ID,
              participant_2_id: target.userId,
              booking_id: target.bookingId,
              listing_id: target.listingId,
              thread_type: "user_to_support"
            })
            .select("id")
            .single();
            
          if (threadError) throw threadError;
          threadId = newThread.id;
        }

        // Step 2: Insert message (RLS will now pass because thread_type = user_to_support)
        const { error: messageError } = await supabase
          .from("messages")
          .insert({
            thread_id: threadId,
            from_user_id: SUPPORT_USER_ID,
            to_user_id: target.userId,
            body: message.trim(),
          });

        if (messageError) throw messageError;

        toast({
          title: "Message sent",
          description: `Your message to ${target.userName} has been sent.`,
        });

        setMessage("");
        onOpenChange(false);
        
        // Navigate to support inbox with thread selected
        navigate(`/admin/support?thread=${threadId}`);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
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
          <DialogTitle>Contact {target?.type === 'host' ? 'Host' : 'Guest'}</DialogTitle>
          <DialogDescription>
            Send a message to {target?.userName} regarding booking for {target?.listingTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground text-right">
            {message.length} / 1000 characters
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setMessage("");
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || message.length > 1000 || loading}
          >
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
