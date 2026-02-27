import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, StatusValue } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { HostPayout } from "./types/financial";
import { PayoutDetailsDialog } from "./PayoutDetailsDialog";
import { useState } from "react";

interface HostPayoutsTableProps {
  payouts: HostPayout[];
  isLoading: boolean;
}

type TransactionTypeBadgeProps = {
  type: HostPayout['transaction_type'];
};

function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  const badgeConfig = {
    regular_earning: { label: "Earning", variant: "default" as const, className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700" },
    booking_payout: { label: "Earning", variant: "default" as const, className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700" },
    debt_collection: { label: "Debt Collection", variant: "secondary" as const, className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-700" },
    refund_debt: { label: "Refund Debt", variant: "destructive" as const, className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-700" },
    refund: { label: "Refund", variant: "destructive" as const, className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-700" },
    cancelled: { label: "Cancellation Fee", variant: "outline" as const, className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-700" },
  };

  const config = badgeConfig[type] || badgeConfig.booking_payout;
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
}

function mapPayoutStatus(status: string, transactionType: HostPayout['transaction_type'], guestDebtStatus: string | null): StatusValue {
  // Handle debt-specific statuses
  if (status === 'settled') return 'succeeded';
  if (status === 'partially_settled') return 'processing';
  if (status === 'applied_to_debt') return 'cancelled';
  
  // Special handling for debt collections
  if (transactionType === 'debt_collection') {
    if (guestDebtStatus === 'outstanding') {
      return 'pending';
    }
    if (status === 'pending') {
      return 'processing';
    }
  }

  // Regular status mapping
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

const isDebtRecord = (payout: HostPayout) => {
  return payout.amount < 0 || payout.transaction_type === 'refund_debt';
};

function getRowClassName(payout: HostPayout): string {
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

export function HostPayoutsTable({ payouts, isLoading }: HostPayoutsTableProps) {
  const [selectedPayout, setSelectedPayout] = useState<HostPayout | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const truncateId = (id: string) => `${id.slice(0, 8)}...`;

  const handleViewDetails = (payout: HostPayout) => {
    setSelectedPayout(payout);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Booking ID</TableHead>
              <TableHead className="font-semibold">Transaction Type</TableHead>
              <TableHead className="font-semibold">Listing</TableHead>
              <TableHead className="font-semibold">Guest</TableHead>
              <TableHead className="font-semibold">Dates</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Pay Date</TableHead>
              <TableHead className="font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No payouts found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="font-semibold">Booking ID</TableHead>
            <TableHead className="font-semibold">Transaction Type</TableHead>
            <TableHead className="font-semibold">Listing</TableHead>
            <TableHead className="font-semibold">Guest</TableHead>
            <TableHead className="font-semibold">Dates</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Pay Date</TableHead>
              <TableHead className="font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {payouts.map((payout) => {
            const truncatedBookingId = truncateId(payout.booking_id);
            const isDebt = isDebtRecord(payout);
            const rowClassName = getRowClassName(payout);

            return (
              <TableRow key={`${payout.booking_id}-${payout.id || 'cancelled'}`} className={rowClassName}>
                {/* Booking ID */}
                <TableCell className="font-medium">
                  {truncatedBookingId}
                </TableCell>

                {/* Transaction Type Badge */}
                <TableCell>
                  <TransactionTypeBadge type={payout.transaction_type} />
                </TableCell>

                {/* Listing */}
                <TableCell className="max-w-[200px] truncate">{payout.listing_title}</TableCell>

                {/* Guest */}
                <TableCell>
                  <div>
                    <div className="font-medium">{payout.guest_name}</div>
                    <div className="text-xs text-muted-foreground">{payout.guest_email}</div>
                  </div>
                </TableCell>

                {/* Dates */}
                <TableCell>
                  {payout.checkin_date && payout.checkout_date ? (
                    <div className="text-sm">
                      <div>{format(new Date(payout.checkin_date), "MMM dd")}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(payout.checkout_date), "MMM dd, yyyy")}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </TableCell>

                {/* Amount */}
                <TableCell className="text-right">
                  <div className={`font-semibold ${isDebt ? "text-red-600" : "text-green-600"}`}>
                    {payout.currency} {isDebt ? "-" : ""}${Math.abs(payout.amount).toFixed(2)}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge status={mapPayoutStatus(payout.status, payout.transaction_type, payout.guest_debt_status)} />
                </TableCell>

                {/* Pay Date */}
                <TableCell>
                  {payout.payout_date ? (
                    format(new Date(payout.payout_date), "MMM dd, yyyy")
                  ) : (
                    <span className="text-muted-foreground">Pending</span>
                  )}
                </TableCell>

                {/* Action */}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewDetails(payout)}
                    className="h-8 w-8"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <PayoutDetailsDialog
        payout={selectedPayout}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
