import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEuro } from "@/lib/utils";

interface DashboardPayout {
  id: string;
  booking_id: string;
  amount: number;
  commission_amount: number | null;
  status: string;
  transaction_type: string;
}

interface DashboardRecentPayoutsProps {
  userId: string;
}

const formatPrice = formatEuro;

const TransactionTypeBadge = ({ type }: { type: string }) => {
  const badgeConfig = {
    regular_earning: { label: "Revenu", variant: "default" as const, className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700" },
    booking_payout: { label: "Revenu", variant: "default" as const, className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700" },
    debt_collection: { label: "Recouvrement", variant: "secondary" as const, className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-700" },
    refund_debt: { label: "Remboursement", variant: "destructive" as const, className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-700" },
    refund: { label: "Remboursement", variant: "destructive" as const, className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-700" },
    cancelled: { label: "Annulation", variant: "outline" as const, className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-700" },
  };
  const config = badgeConfig[type as keyof typeof badgeConfig] || badgeConfig.booking_payout;
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

const mapPayoutStatus = (status: string): "confirmed" | "pending_payment" | "cancelled" | "completed" | "cancelled_guest" | "cancelled_host" | "expired" => {
  const statusMap: Record<string, any> = {
    pending: "pending_payment",
    completed: "completed",
    failed: "cancelled",
    pending_guest_payment: "pending_payment",
  };
  return statusMap[status] || "pending_payment";
};

export default function DashboardRecentPayouts({ userId }: DashboardRecentPayoutsProps) {
  const { data: payouts, isLoading } = useQuery({
    queryKey: ["dashboard-recent-payouts", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("host_search_payouts", {
        p_host_user_id: userId,
        p_search_query: null,
        p_status_filter: null,
        p_transaction_type_filter: null,
        p_min_amount: null,
        p_max_amount: null,
        p_sort_by: "created_at",
        p_sort_order: "desc",
      });
      if (error) throw error;
      return (data?.slice(0, 7) || []) as DashboardPayout[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!payouts || payouts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun versement</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {payouts.map((payout) => (
          <div key={payout.id} className="p-3 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <TransactionTypeBadge type={payout.transaction_type} />
              <StatusBadge status={mapPayoutStatus(payout.status)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">{payout.booking_id.slice(0, 8)}</span>
              <span className={`text-sm font-semibold ${payout.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatPrice(payout.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">ID Réservation</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Montant</TableHead>
              <TableHead className="font-semibold">Frais</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => (
              <TableRow key={payout.id}>
                <TableCell className="font-mono text-sm">{payout.booking_id.slice(0, 8)}</TableCell>
                <TableCell><TransactionTypeBadge type={payout.transaction_type} /></TableCell>
                <TableCell className={`font-semibold ${payout.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatPrice(payout.amount)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {payout.commission_amount ? formatPrice(payout.commission_amount) : "-"}
                </TableCell>
                <TableCell><StatusBadge status={mapPayoutStatus(payout.status)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
