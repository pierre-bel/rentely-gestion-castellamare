import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useDisputeDetails } from "@/hooks/useDisputeDetails";
import { useDemoData } from "@/hooks/useDemoData";
import { DisputeCaseSummary } from "./DisputeCaseSummary";
import { DisputeOverviewTab } from "./DisputeOverviewTab";
import { DisputeMessageLogTab } from "./DisputeMessageLogTab";
import { DisputeResolutionPanel } from "./DisputeResolutionPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DisputeResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputeId: string | null;
}

export const DisputeResolutionDialog = ({
  open,
  onOpenChange,
  disputeId,
}: DisputeResolutionDialogProps) => {
  const { isDemoMode, adminResolveDispute } = useDemoData();
  const { data, isLoading } = useDisputeDetails(disputeId);
  const [activeTab, setActiveTab] = useState("overview");
  const [refundAmount, setRefundAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligibleAmount, setEligibleAmount] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const dispute = data && typeof data === 'object' && 'dispute' in data ? (data as any).dispute : null;
  const isResolved = dispute?.status === 'resolved_approved' || dispute?.status === 'resolved_declined';

  // Populate fields when data loads
  useEffect(() => {
    if (data && typeof data === 'object' && 'dispute' in data) {
      const disputeData = data.dispute as any;
      setRefundAmount(disputeData.approved_refund_amount?.toString() || "");
      setNotes(disputeData.resolution_notes || "");
      setDecision(disputeData.admin_decision || "");
    }
  }, [data]);

  // Fetch eligible amount
  useEffect(() => {
    const fetchEligibleAmount = async () => {
      if (data && typeof data === 'object' && 'booking' in data) {
        const bookingData = data.booking as any;
        try {
          const { data: eligible, error } = await supabase.rpc('get_eligible_refund_amount', {
            p_booking_id: bookingData.id
          });
          if (!error && eligible !== null) {
            setEligibleAmount(eligible);
          }
        } catch (error) {
          console.error('Error fetching eligible amount:', error);
        }
      }
    };
    fetchEligibleAmount();
  }, [data]);

  const handleSave = async () => {
    if (!disputeId) return;

    setSaving(true);
    try {
      if (isDemoMode) {
        // DEMO MODE: Save to localStorage
        const result = adminResolveDispute(
          disputeId,
          decision || null,
          refundAmount ? parseFloat(refundAmount) : null,
          notes || null,
          false // isSubmit = false for save
        );
        
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to save resolution",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Saved",
          description: "Draft resolution saved successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["dispute-details", disputeId] });
        queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      } else {
        // REAL MODE: Save to Supabase
        const { data: result, error } = await supabase.rpc("admin_resolve_dispute", {
          p_dispute_id: disputeId,
          p_admin_decision: decision || null,
          p_approved_refund_amount: refundAmount ? parseFloat(refundAmount) : null,
          p_resolution_notes: notes || null,
          p_is_submit: false,
        });

        if (error) throw error;

        // Check for function-level errors
        if (result && typeof result === 'object' && 'success' in result && !result.success) {
          toast({
            title: "Error",
            description: String(result.error) || "Failed to save resolution",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Saved",
          description: "Draft resolution saved successfully",
        });

        queryClient.invalidateQueries({ queryKey: ["dispute-details", disputeId] });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save resolution",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!disputeId) return;

    // Validate required fields
    if (!decision) {
      toast({
        title: "Missing decision",
        description: "Please select a decision",
        variant: "destructive",
      });
      return;
    }

    if (decision === "approve" && !refundAmount) {
      toast({
        title: "Missing refund amount",
        description: "Please enter refund amount for approval",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (isDemoMode) {
        // DEMO MODE: Submit to localStorage
        const result = adminResolveDispute(
          disputeId,
          decision,
          refundAmount ? parseFloat(refundAmount) : null,
          notes || null,
          true // isSubmit = true
        );
        
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to submit resolution",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Resolution submitted",
          description: "Dispute has been resolved successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["dispute-details", disputeId] });
        queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
        onOpenChange(false);
      } else {
        // REAL MODE: Submit to Supabase
        const { data: result, error } = await supabase.rpc("admin_resolve_dispute", {
          p_dispute_id: disputeId,
          p_admin_decision: decision,
          p_approved_refund_amount: refundAmount ? parseFloat(refundAmount) : null,
          p_resolution_notes: notes || null,
          p_is_submit: true,
        });

        if (error) throw error;

        // Check for function-level errors
        if (result && typeof result === 'object' && 'success' in result && !result.success) {
          toast({
            title: "Error",
            description: String(result.error) || "Failed to submit resolution",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Resolution submitted",
          description: "Dispute has been resolved successfully",
        });

        queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit resolution",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!data && !isLoading) return null;

  const booking = data && typeof data === 'object' && 'booking' in data ? (data as any).booking : null;
  const listing = data && typeof data === 'object' && 'listing' in data ? (data as any).listing : null;
  const guest = data && typeof data === 'object' && 'guest' in data ? (data as any).guest : null;
  const host = data && typeof data === 'object' && 'host' in data ? (data as any).host : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-[1400px] h-[90vh] md:h-[70vh] p-0 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 space-y-3 md:space-y-4 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg md:text-2xl" style={{ color: '#143F3E' }}>
                  Dispute Resolution
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Review dispute details, messages, and resolution options.
                </DialogDescription>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs md:text-sm">
                <div>
                  <span className="text-muted-foreground">Booking ID </span>
                  <span className="font-medium">B-{booking?.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex flex-col md:flex-row gap-1 md:gap-4 text-muted-foreground">
                  <span>Opened {format(new Date(dispute?.created_at), "MM/dd/yyyy")}</span>
                  <span>Updated {format(new Date(dispute?.updated_at), "MM/dd/yyyy")}</span>
                </div>
              </div>
            </DialogHeader>

            {/* Mobile Layout - Vertical Stack */}
            <div className="flex md:hidden flex-col flex-1 overflow-auto">
              <div className="px-4 py-3 space-y-4">
                <DisputeCaseSummary
                  dispute={dispute}
                  guest={guest}
                  host={host}
                  listing={listing}
                  booking={booking}
                />
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="message-log">Messages</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="mt-4">
                    <DisputeOverviewTab dispute={dispute} booking={booking} />
                  </TabsContent>
                  <TabsContent value="message-log" className="mt-4">
                    <DisputeMessageLogTab threadId={dispute?.support_thread_id} />
                  </TabsContent>
                </Tabs>

                <DisputeResolutionPanel
                  refundAmount={refundAmount}
                  setRefundAmount={setRefundAmount}
                  notes={notes}
                  setNotes={setNotes}
                  decision={decision}
                  setDecision={setDecision}
                  disabled={isResolved}
                  eligibleAmount={eligibleAmount !== null ? eligibleAmount : undefined}
                  bookingTotal={booking?.total_price}
                />
              </div>
            </div>

            {/* Desktop Layout - Three Columns */}
            <div className="hidden md:flex gap-4 flex-1 px-6 overflow-hidden min-h-0">
              {/* Left Panel */}
              <div className="w-[300px] overflow-auto min-h-0">
                <DisputeCaseSummary
                  dispute={dispute}
                  guest={guest}
                  host={host}
                  listing={listing}
                  booking={booking}
                />
              </div>

              {/* Center Panel */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="message-log">Message Log</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="flex-1 min-h-0 overflow-auto">
                    <DisputeOverviewTab dispute={dispute} booking={booking} />
                  </TabsContent>
                  <TabsContent value="message-log" className="flex-1 min-h-0 overflow-auto">
                    <DisputeMessageLogTab threadId={dispute?.support_thread_id} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Panel */}
              <div className="w-[350px] overflow-auto min-h-0">
                <DisputeResolutionPanel
                  refundAmount={refundAmount}
                  setRefundAmount={setRefundAmount}
                  notes={notes}
                  setNotes={setNotes}
                  decision={decision}
                  setDecision={setDecision}
                  disabled={isResolved}
                  eligibleAmount={eligibleAmount !== null ? eligibleAmount : undefined}
                  bookingTotal={booking?.total_price}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-2 px-4 md:px-6 py-3 md:py-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full md:w-auto">
                {isResolved ? "Close" : "Cancel"}
              </Button>
              {!isResolved && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSave} disabled={saving || submitting} className="flex-1 md:flex-initial">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving || submitting} className="flex-1 md:flex-initial">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
