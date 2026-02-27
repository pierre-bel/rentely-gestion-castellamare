import { format } from "date-fns";
import { DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, StatusValue } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Payout } from "./types/financial";
import { PayoutDetailsDialog } from "./PayoutDetailsDialog";

interface PayoutsTableProps {
  payouts: Payout[];
  loading: boolean;
  isDemoMode?: boolean;
  onMarkAsPaid?: (payoutId: string) => Promise<void>;
}

type TransactionTypeBadgeProps = {
  type: Payout['transaction_type'];
};

function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  const badgeConfig = {
    regular_earning: { label: "Earning", className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700" },
    booking_payout: { label: "Earning", className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700" },
    debt_collection: { label: "Debt Collection", className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-700" },
    refund_debt: { label: "Refund Debt", className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-700" },
    refund: { label: "Refund", className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-700" },
    cancelled: { label: "Cancellation Fee", className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-700" },
  };

  const config = badgeConfig[type] || badgeConfig.booking_payout;
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

function mapPayoutStatus(status: string, transactionType: Payout['transaction_type'], guestDebtStatus: string | null): StatusValue {
  if (status === 'settled') return 'succeeded';
  if (status === 'partially_settled') return 'processing';
  if (status === 'applied_to_debt') return 'cancelled';
  
  if (transactionType === 'debt_collection') {
    if (guestDebtStatus === 'outstanding') {
      return 'pending';
    }
    if (status === 'pending') {
      return 'processing';
    }
  }

  switch (status) {
    case "completed": return 'succeeded';
    case "pending": return 'pending';
    case "processing": return 'processing';
    case "failed": return 'failed';
    case "cancelled": return 'cancelled';
    case "debit": return 'pending';
    default: return 'pending';
  }
}

function getRowClassName(payout: Payout): string {
  const baseClass = "hover:shadow-sm transition-shadow";
  
  switch (payout.transaction_type) {
    case 'regular_earning':
    case 'booking_payout':
      if (payout.status === 'completed') {
        return `${baseClass} bg-green-50/50`;
      }
      return baseClass;
    case 'debt_collection':
      return `${baseClass} bg-blue-50/50`;
    case 'refund_debt':
    case 'refund':
      return `${baseClass} bg-red-50/50`;
    case 'cancelled':
      return `${baseClass} bg-amber-50/50`;
    default:
      return baseClass;
  }
}

const PayoutsTable = ({ payouts, loading, isDemoMode = false, onMarkAsPaid }: PayoutsTableProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);

  const truncateId = (id: string) => `${id.slice(0, 8)}...`;

  const handleViewDetails = (payout: Payout) => {
    setSelectedPayout(payout);
    setDialogOpen(true);
  };

  const handleMarkAsPaid = async (payoutId: string) => {
    setMarkingPaid(payoutId);
    
    try {
      if (isDemoMode && onMarkAsPaid) {
        await onMarkAsPaid(payoutId);
      } else {
        const { data, error } = await supabase.rpc("admin_mark_payout_completed", {
          p_payout_id: payoutId,
        });

        if (error) throw error;

        const result = data as { success: boolean; error?: string } | null;

        if (result?.success) {
          toast({
            title: "Success",
            description: "Payout marked as completed successfully",
          });
          queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
        } else {
          throw new Error(result?.error || "Failed to mark payout as completed");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark payout as completed",
        variant: "destructive",
      });
    } finally {
      setMarkingPaid(null);
      setConfirmDialogOpen(false);
      setSelectedPayoutId(null);
    }
  };

  const openConfirmDialog = (payoutId: string) => {
    setSelectedPayoutId(payoutId);
    setConfirmDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No payouts found</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Booking ID</TableHead>
              <TableHead className="font-semibold">Transaction Type</TableHead>
              <TableHead className="font-semibold">Host</TableHead>
              <TableHead className="font-semibold hidden 2xl:table-cell">Listing</TableHead>
              <TableHead className="font-semibold hidden 3xl:table-cell">Dates</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold hidden 2xl:table-cell">Pay Date</TableHead>
              <TableHead className="font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => {
              const isNegative = Number(payout.amount) < 0;
              const rowClassName = getRowClassName(payout);
              return (
              <TableRow key={payout.id} className={rowClassName}>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-mono text-xs cursor-help">
                        {truncateId(payout.booking_id)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs">{payout.booking_id}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <TransactionTypeBadge type={payout.transaction_type} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={payout.host_avatar} />
                      <AvatarFallback>
                        {payout.host_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{payout.host_name}</span>
                      <span className="text-xs text-muted-foreground">{payout.host_email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  <div className="max-w-[200px] truncate">
                    <span className="text-sm font-medium">{payout.listing_title}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden 3xl:table-cell">
                  {payout.checkin_date && payout.checkout_date ? (
                    <div className="text-sm">
                      <div>{format(new Date(payout.checkin_date), "MMM dd")}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(payout.checkout_date), "MMM dd, yyyy")}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-semibold ${isNegative ? "text-red-600" : "text-green-600"}`}>
                    {payout.currency} {isNegative ? "-" : ""}${Math.abs(Number(payout.amount)).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={mapPayoutStatus(payout.status, payout.transaction_type, payout.guest_debt_status)} />
                </TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {payout.payout_date
                      ? format(new Date(payout.payout_date), "MMM dd, yyyy")
                      : "Pending"}
                  </span>
                </TableCell>
                <TableCell>
                  {payout.status === "pending" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => openConfirmDialog(payout.id)}
                      disabled={markingPaid === payout.id}
                    >
                      <DollarSign className="h-4 w-4" />
                      Mark as Paid
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>

      <PayoutDetailsDialog
        payout={selectedPayout}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Payout as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this payout as completed? This action confirms that the payment has been successfully processed and sent to the host.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPayoutId && handleMarkAsPaid(selectedPayoutId)}
              disabled={!!markingPaid}
            >
              {markingPaid ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default PayoutsTable;
