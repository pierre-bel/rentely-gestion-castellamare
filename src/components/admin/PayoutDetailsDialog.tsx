import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Payout } from "./types/financial";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PayoutDetailsDialogProps {
  payout: Payout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayoutDetailsDialog({ payout, open, onOpenChange }: PayoutDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [marking, setMarking] = useState(false);

  if (!payout) return null;

  const isPendingGuestPayment = payout.status === 'pending_guest_payment';
  const isDebtCollection = payout.transaction_type === 'debt_collection';
  const isRefundDebt = payout.transaction_type === 'refund_debt';
  const isDebtTransaction = isRefundDebt || isDebtCollection;
  const isCancellationFee = payout.transaction_type === 'cancelled';
  const hasDebtApplied = payout.total_dispute_refunds != null && payout.total_dispute_refunds > 0;
  const originalAmount = payout.original_amount ?? payout.amount;
  
  const baseSubtotal = payout.base_subtotal ?? 0;
  const baseCleaningFee = payout.base_cleaning_fee ?? 0;
  const grossRevenue = payout.gross_revenue ?? 0;
  
  const stayRevenue = baseSubtotal;
  const cleaningFee = baseCleaningFee;
  const grossTotal = grossRevenue;

  const handleMarkAsPaid = async () => {
    setMarking(true);
    
    try {
      const { data, error } = await supabase.rpc("admin_mark_payout_completed", {
        p_payout_id: payout.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string } | null;

      if (result?.success) {
        toast({
          title: "Success",
          description: "Payout marked as completed successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
        onOpenChange(false);
      } else {
        throw new Error(result?.error || "Failed to mark payout as completed");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark payout as completed",
        variant: "destructive",
      });
    } finally {
      setMarking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payout Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cancellation Fee Explanation */}
          {isCancellationFee && payout.refund_percentage_applied != null && payout.refund_percentage_applied > 0 && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>Cancellation Fee Income:</strong> The guest received a {payout.refund_percentage_applied}% refund. Host receives the retained amount ({100 - payout.refund_percentage_applied}%) minus platform commission.
              </AlertDescription>
            </Alert>
          )}

          {/* 100% Retention Policy Explanation */}
          {isCancellationFee && (payout.refund_amount == null || payout.refund_amount === 0) && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm">
                <strong>100% Retention Policy:</strong> The cancellation policy for this booking allowed 0% refund to the guest. Host receives the full retained amount after platform commission.
              </AlertDescription>
            </Alert>
          )}

          {/* Debt Collection Explanation */}
          {isDebtCollection && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong>Debt Collection Income:</strong> This amount is from a resolved dispute in the host's favor. The guest has paid or will pay this amount as compensation for damages or policy violations.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Card - Only for regular earnings with debt applied */}
          {!isDebtTransaction && !isPendingGuestPayment && !isCancellationFee && hasDebtApplied && payout.amount > 0 && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    Expected Payout: <span className="font-semibold text-foreground">${originalAmount.toFixed(2)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Dispute Refunds: <span className="font-semibold text-destructive">-${payout.total_dispute_refunds!.toFixed(2)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Host Receives: <span className="font-semibold text-primary">${payout.amount.toFixed(2)}</span>
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Overview */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Transaction Overview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Booking ID:</span>
                <p className="font-mono mt-1">{payout.booking_id.substring(0, 8)}...</p>
              </div>
              <div>
                <span className="text-muted-foreground">Transaction Type:</span>
                <div className="mt-1">
                  <Badge 
                    variant={isRefundDebt ? "destructive" : isDebtCollection ? "default" : "default"}
                    className={
                      isCancellationFee 
                        ? "bg-amber-100 text-amber-700 border-amber-200" 
                        : isDebtCollection 
                        ? "bg-blue-100 text-blue-700 border-blue-200" 
                        : isRefundDebt
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-green-100 text-green-700 border-green-200"
                    }
                  >
                    {isCancellationFee 
                      ? "CANCELLATION FEE" 
                      : isDebtCollection 
                      ? "DEBT COLLECTION"
                      : isRefundDebt
                      ? "REFUND DEBT"
                      : payout.transaction_type.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium mt-1 capitalize">{payout.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="mt-1">{format(new Date(payout.created_at), "MMM dd, yyyy h:mm a")}</p>
              </div>
              {payout.payout_date && (
                <div>
                  <span className="text-muted-foreground">Payout Date:</span>
                  <p className="mt-1">{format(new Date(payout.payout_date), "MMM dd, yyyy")}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Host and Guest Details */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Parties Involved</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Host:</span>
                <p className="font-medium mt-1">{payout.host_name}</p>
                <p className="text-xs text-muted-foreground">{payout.host_email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Guest:</span>
                <p className="font-medium mt-1">{payout.guest_name}</p>
                <p className="text-xs text-muted-foreground">{payout.guest_email}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Booking Details */}
          {payout.listing_title && (
            <>
              <div>
                <h3 className="font-semibold mb-3 text-lg">Booking Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Listing:</span>
                    <p className="font-medium mt-1">{payout.listing_title}</p>
                  </div>
                  {payout.checkin_date && payout.checkout_date && (
                    <div>
                      <span className="text-muted-foreground">Stay Period:</span>
                      <p className="mt-1">
                        {format(new Date(payout.checkin_date), "MMM dd, yyyy")} - {format(new Date(payout.checkout_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  )}
                  {payout.booking_status && (
                    <div>
                      <span className="text-muted-foreground">Booking Status:</span>
                      <p className="font-medium mt-1 capitalize">{payout.booking_status}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Financial Breakdown */}
          <div>
            <h3 className="font-semibold mb-4 text-lg">
              {isPendingGuestPayment ? "Pending Payment Details" : isDebtCollection ? "Dispute Collection Details" : isRefundDebt ? "Debt Details" : "Financial Breakdown"}
            </h3>
            
            {isDebtCollection ? (
              <div className="space-y-4">
                {(payout.dispute_ids?.length > 0 || payout.dispute_category || payout.guest_debt_status) && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                    {payout.dispute_ids && payout.dispute_ids.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dispute ID:</span>
                        <span className="font-mono">{payout.dispute_ids[0].substring(0, 8)}</span>
                      </div>
                    )}
                    {payout.dispute_category && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="capitalize">{payout.dispute_category.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    {payout.guest_debt_status && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Status:</span>
                        <Badge variant="outline" className="capitalize">
                          {payout.guest_debt_status}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center font-bold text-lg py-4 px-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                  <span>Collection Amount</span>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    {payout.currency} +${Math.abs(payout.amount).toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  This income is from a dispute resolved in the host's favor.
                </p>
              </div>
            ) : isRefundDebt ? (
              <div className="space-y-4">
                <Alert className="border-destructive/20 bg-destructive/5">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-sm">
                    <strong>Guest Refund Debt:</strong> This represents a refund issued to the guest. This amount will be deducted from the host's next payout for this booking.
                  </AlertDescription>
                </Alert>

                {payout.dispute_ids && payout.dispute_ids.length > 0 && (
                  <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dispute ID:</span>
                      <span className="font-mono">{payout.dispute_ids[0].substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="text-right">Guest refund approved by admin</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center font-bold text-lg py-4 px-4 bg-destructive/5 border-2 border-destructive/20 rounded-lg">
                  <span>Refund Amount</span>
                  <span className="font-mono text-destructive">
                    -${Math.abs(payout.amount).toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {payout.booking_status === 'confirmed' 
                    ? 'This debt will be automatically deducted when the booking is completed.'
                    : 'This debt represents a refund that was issued to the guest.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {/* REVENUE SECTION */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</div>
                  
                  {stayRevenue > 0 && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">Stay Revenue</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        +${stayRevenue.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {cleaningFee > 0 && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">Cleaning Fee</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        +${cleaningFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {grossTotal > 0 && (
                    <div className="flex justify-between items-center font-medium pt-1 border-t">
                      <span>Gross Total</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        ${grossTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                {/* DEDUCTIONS SECTION */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deductions</div>
                  
                  {isCancellationFee && payout.refund_percentage_applied != null && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">
                        Guest Refund ({payout.refund_percentage_applied}%)
                      </span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        -${(grossTotal * payout.refund_percentage_applied / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {payout.commission_amount != null && payout.commission_amount > 0 && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">Platform Commission</span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        -${payout.commission_amount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {hasDebtApplied && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">Dispute Refunds</span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        -${payout.total_dispute_refunds!.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                {/* FINAL PAYOUT */}
                <div className="flex justify-between items-center font-bold text-lg py-3 px-3 bg-primary/5 border-2 border-primary/20 rounded-lg">
                  <span>Host Receives</span>
                  <span className="font-mono text-primary">
                    {payout.currency} ${payout.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {payout.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 text-lg">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{payout.notes}</p>
              </div>
            </>
          )}

          {/* Admin Actions */}
          {payout.status === 'pending' && (
            <>
              <Separator />
              <div className="flex justify-end">
                <Button 
                  onClick={handleMarkAsPaid}
                  disabled={marking}
                  className="gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  {marking ? "Processing..." : "Mark as Paid"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
