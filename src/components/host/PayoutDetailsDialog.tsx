import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HostPayout } from "./types/financial";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PayoutDetailsDialogProps {
  payout: HostPayout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayoutDetailsDialog({ payout, open, onOpenChange }: PayoutDetailsDialogProps) {
  if (!payout) return null;

  const isPendingGuestPayment = payout.status === 'pending_guest_payment';
  const isDebtCollection = payout.transaction_type === 'debt_collection';
  // Debt records have status='debit' and transaction_type='refund' (negative amounts)
  const isRefundDebt = payout.transaction_type === 'refund_debt';
  const isDebtTransaction = isRefundDebt || isDebtCollection;
  const isCancellationFee = payout.transaction_type === 'cancelled';
  const hasDebtApplied = payout.total_dispute_refunds != null && payout.total_dispute_refunds > 0;
  const originalAmount = payout.original_amount ?? payout.amount;
  
  // Use pre-calculated fields from payout table
  const baseSubtotal = payout.base_subtotal ?? 0;
  const baseCleaningFee = payout.base_cleaning_fee ?? 0;
  const grossRevenue = payout.gross_revenue ?? 0;
  
  // For display
  const stayRevenue = baseSubtotal;
  const cleaningFee = baseCleaningFee;
  const grossTotal = grossRevenue;

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
                <strong>Cancellation Fee Income:</strong> The guest received a {payout.refund_percentage_applied}% refund. You receive the retained amount ({100 - payout.refund_percentage_applied}%) minus platform commission.
              </AlertDescription>
            </Alert>
          )}

          {/* 100% Retention Policy Explanation */}
          {isCancellationFee && (payout.refund_amount == null || payout.refund_amount === 0) && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm">
                <strong>100% Retention Policy:</strong> The cancellation policy for this booking allowed 0% refund to the guest. You receive the full retained amount after platform commission.
              </AlertDescription>
            </Alert>
          )}

          {/* Debt Collection Explanation */}
          {isDebtCollection && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong>Debt Collection Income:</strong> This amount is from a resolved dispute in your favor. The guest has paid or will pay this amount to you as compensation for damages or policy violations.
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
                    You Receive: <span className="font-semibold text-primary">${payout.amount.toFixed(2)}</span>
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
                <p className="font-mono mt-1">{payout.booking_id}</p>
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
                        : ""
                    }
                  >
                    {isCancellationFee 
                      ? "CANCELLATION FEE" 
                      : isDebtCollection 
                      ? "DEBT COLLECTION"
                      : isRefundDebt
                      ? "REFUND"
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
                  <div>
                    <span className="text-muted-foreground">Guest:</span>
                    <p className="font-medium mt-1">{payout.guest_name}</p>
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

          {/* Financial Breakdown - Simplified for Debt Transactions */}
          <div>
            <h3 className="font-semibold mb-4 text-lg">
              {isPendingGuestPayment ? "Pending Payment Details" : isDebtCollection ? "Dispute Collection Details" : isRefundDebt ? "Debt Details" : "Financial Breakdown"}
            </h3>
            
            {isPendingGuestPayment ? (
              // SIMPLIFIED VIEW FOR PENDING GUEST PAYMENT
              <div className="space-y-4">
                {/* Dispute Information */}
                <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-3">
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
                      <span className="capitalize">{payout.guest_debt_status}</span>
                    </div>
                  )}
                </div>
                
                {/* Pending Payout Amount */}
                <div className="flex justify-between items-center font-bold text-lg py-4 px-4 bg-muted/30 border-2 border-border rounded-lg">
                  <span>Pending Payout</span>
                  <span className="font-mono">
                    {payout.currency} ${payout.amount.toFixed(2)}
                  </span>
                </div>
                
                {/* Explanation Note */}
                <p className="text-xs text-muted-foreground text-center">
                  This payout will be processed once the guest pays their outstanding debt.
                </p>
              </div>
            ) : isDebtCollection ? (
              // DEBT COLLECTION BREAKDOWN (Income from resolved dispute)
              <div className="space-y-4">
                {/* Dispute Information - only show if there's data */}
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
                
                {/* Collection Amount */}
                <div className="flex justify-between items-center font-bold text-lg py-4 px-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                  <span>Collection Amount</span>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    {payout.currency} +${Math.abs(payout.amount).toFixed(2)}
                  </span>
                </div>

                {/* Explanation Note */}
                <p className="text-xs text-muted-foreground text-center">
                  This income is from a dispute resolved in your favor. The guest has paid compensation for damages or policy violations.
                </p>
              </div>
            ) : isRefundDebt ? (
              // REFUND DEBT BREAKDOWN (Money host owes)
              <div className="space-y-4">
                {/* Warning Alert */}
                <Alert className="border-destructive/20 bg-destructive/5">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-sm">
                    <strong>Guest Refund Debt:</strong> This represents a refund issued to the guest. This amount will be deducted from your next payout for this booking, or if the booking was cancelled before completion, the debt remains on record.
                  </AlertDescription>
                </Alert>

                {/* Dispute Information */}
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
                
                {/* Debt Amount */}
                <div className="flex justify-between items-center font-bold text-lg py-4 px-4 bg-destructive/5 border-2 border-destructive/20 rounded-lg">
                  <span>Refund Amount</span>
                  <span className="font-mono text-destructive">
                    -${Math.abs(payout.amount).toFixed(2)}
                  </span>
                </div>

                {/* Explanation */}
                <p className="text-xs text-muted-foreground text-center">
                  {payout.booking_status === 'confirmed' 
                    ? 'This debt will be automatically deducted when the booking is completed.'
                    : 'This debt represents a refund that was issued to the guest.'}
                </p>
              </div>
            ) : (
              // DETAILED BREAKDOWN FOR REGULAR EARNINGS
              <div className="space-y-3 text-sm">
                {/* REVENUE SECTION */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</div>
                  
                  {/* Show stay revenue */}
                  {stayRevenue > 0 && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">Stay Revenue</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        +${stayRevenue.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {/* Show cleaning fee */}
                  {cleaningFee > 0 && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">Cleaning Fee</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        +${cleaningFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {/* Show gross total */}
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
                  
                  {/* Show Guest Refund first for cancellations */}
                  {isCancellationFee && payout.refund_percentage_applied != null && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">
                        Guest Refund
                      </span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        -{payout.refund_percentage_applied}%
                      </span>
                    </div>
                  )}
                  
                  {/* Show Retained Amount for cancellations */}
                  {isCancellationFee && payout.host_retained_gross != null && (
                    <div className="flex justify-between items-center pl-3 pt-2 border-t">
                      <span className="text-muted-foreground">Retained Amount</span>
                      <span className="font-mono">
                        ${payout.host_retained_gross.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {/* Show Platform Commission */}
                  {isCancellationFee ? (
                    // For cancellations: use pre-calculated commission_on_retained
                    payout.commission_on_retained != null && (
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-muted-foreground">Platform Commission (on retained)</span>
                        <span className="font-mono text-red-600 dark:text-red-400">
                          -${payout.commission_on_retained.toFixed(2)}
                        </span>
                      </div>
                    )
                  ) : (
                    // For regular bookings: use pre-calculated commission
                    payout.commission_amount != null && payout.commission_amount > 0 && (
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-muted-foreground">Platform Commission</span>
                        <span className="font-mono text-red-600 dark:text-red-400">
                          -${Math.abs(payout.commission_amount).toFixed(2)}
                        </span>
                      </div>
                    )
                  )}
                  
                  {/* Show dispute refunds if applicable (non-cancellation, supports multiple disputes) */}
                  {!isCancellationFee && payout.total_dispute_refunds != null && payout.total_dispute_refunds > 0 && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">
                        Dispute Refund{payout.dispute_ids && payout.dispute_ids.length > 1 ? 's' : ''} to Guest
                        {payout.dispute_ids && payout.dispute_ids.length > 0 && (
                          <span className="text-xs ml-1">
                            ({payout.dispute_ids.length} dispute{payout.dispute_ids.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        -${payout.total_dispute_refunds.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                {/* NET PAYOUT (BEFORE DEBTS) */}
                {payout.booking_host_payout_net != null && payout.booking_host_payout_net > 0 && (
                  <div className="flex justify-between items-center font-medium py-2 px-3 bg-muted/50 rounded">
                    <span>Net Payout (before debts)</span>
                    <span className="font-mono text-base">
                      ${payout.booking_host_payout_net.toFixed(2)}
                    </span>
                  </div>
                )}

                <Separator className="my-4" />

                {/* FINAL PAYOUT */}
                <div className="flex justify-between items-center font-bold text-lg py-3 px-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
                  <span>FINAL PAYOUT</span>
                  <span className="font-mono text-primary">
                    {payout.currency} ${payout.amount.toFixed(2)}
                  </span>
                </div>

                {payout.amount <= 0 && hasDebtApplied && (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      This payout was fully offset by outstanding guest debts. No payment will be made.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {payout.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 text-lg">Notes</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {payout.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
