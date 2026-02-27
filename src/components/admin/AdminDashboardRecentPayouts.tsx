import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type StatusValue } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import type { Payout } from "./types/financial";
import { PayoutDetailsDialog } from "./PayoutDetailsDialog";
import { useDemoData } from "@/hooks/useDemoData";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

const TransactionTypeBadge = ({ type }: { type: string }) => {
  const badgeConfig: Record<string, { label: string; className: string }> = {
    regular_earning: { label: "Earning", className: "bg-green-100 text-green-700 border-green-200" },
    booking_payout: { label: "Earning", className: "bg-green-100 text-green-700 border-green-200" },
    debt_collection: { label: "Debt Collection", className: "bg-blue-100 text-blue-700 border-blue-200" },
    refund_debt: { label: "Refund Debt", className: "bg-red-100 text-red-700 border-red-200" },
    refund: { label: "Refund", className: "bg-red-100 text-red-700 border-red-200" },
    cancelled: { label: "Cancellation Fee", className: "bg-amber-100 text-amber-700 border-amber-200" },
  };

  const config = badgeConfig[type] || { label: type, className: "bg-gray-100 text-gray-700 border-gray-200" };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};

const mapPayoutStatus = (status: string, transactionType: string, guestDebtStatus: string | null): StatusValue => {
  if (status === 'settled') return 'succeeded';
  if (status === 'partially_settled') return 'processing';
  if (status === 'applied_to_debt') return 'cancelled';
  
  if (transactionType === 'debt_collection') {
    if (guestDebtStatus === 'outstanding') return 'pending';
    if (status === 'pending') return 'processing';
  }

  switch (status) {
    case "completed": return 'succeeded';
    case "pending": return 'pending';
    case "processing": return 'processing';
    case "failed": return 'failed';
    case "cancelled": return 'cancelled';
    default: return 'pending';
  }
};

const getRowClassName = (transactionType: string, status: string): string => {
  if (transactionType === 'debt_collection') {
    return 'bg-blue-50/50';
  }
  
  if (transactionType === 'refund_debt' || transactionType === 'refund') {
    return 'bg-red-50/50';
  }
  
  if (transactionType === 'cancelled') {
    return 'bg-amber-50/50';
  }
  
  if ((transactionType === 'regular_earning' || transactionType === 'booking_payout') && 
      (status === 'completed' || status === 'settled')) {
    return 'bg-green-50/50';
  }
  
  return '';
};

const AdminDashboardRecentPayouts = () => {
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isDemoMode, getAdminPayouts } = useDemoData();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["admin-recent-payouts", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        // Demo mode: Get from localStorage
        const allPayouts = getAdminPayouts({
          searchQuery: null,
          transactionTypeFilter: null,
          statusFilter: null,
          minAmount: null,
          maxAmount: null,
          sortBy: 'created_at',
          sortOrder: 'desc',
        });
        return (allPayouts || []).slice(0, 6) as Payout[];
      } else {
        // Real mode: Fetch from Supabase
        const { data, error } = await supabase.rpc("admin_search_payouts", {
          search_query: null,
          transaction_type_filter: null,
          status_filter: null,
          min_amount: null,
          max_amount: null,
          sort_by: 'created_at',
          sort_order: 'desc',
        });
        if (error) throw error;
        return (data || []).slice(0, 6) as Payout[];
      }
    },
  });

  const handleViewDetails = (payout: Payout) => {
    setSelectedPayout(payout);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!payouts || payouts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No payouts found</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Listing</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => {
              const truncatedBookingId = payout.booking_id ? `${payout.booking_id.slice(0, 8)}...` : 'N/A';
              const isNegative = payout.amount < 0;
              const rowClass = getRowClassName(payout.transaction_type, payout.status);

              return (
                <TableRow 
                  key={payout.id} 
                  className={`${rowClass} cursor-pointer hover:bg-accent/50`}
                  onClick={() => handleViewDetails(payout)}
                >
                  <TableCell className="font-mono text-xs">
                    {truncatedBookingId}
                  </TableCell>
                  <TableCell>
                    <TransactionTypeBadge type={payout.transaction_type} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {payout.host_name}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {payout.listing_title}
                  </TableCell>
                  <TableCell>
                    <span className={isNegative ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                      {isNegative ? '-' : ''}{formatPrice(Math.abs(payout.amount))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge 
                      status={mapPayoutStatus(payout.status, payout.transaction_type, payout.guest_debt_status)} 
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedPayout && (
        <PayoutDetailsDialog
          payout={selectedPayout}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </>
  );
};

export default AdminDashboardRecentPayouts;
