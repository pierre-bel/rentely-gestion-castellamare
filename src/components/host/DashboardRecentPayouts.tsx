import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";

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

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
};

const TransactionTypeBadge = ({ type }: { type: string }) => {
  const badgeConfig = {
    regular_earning: { label: "Revenu", variant: "default" as const, className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700" },
    booking_payout: { label: "Revenu", variant: "default" as const, className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700" },
    debt_collection: { label: "Recouvrement", variant: "secondary" as const, className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-700" },
    refund_debt: { label: "Remboursement dette", variant: "destructive" as const, className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-700" },
    refund: { label: "Remboursement", variant: "destructive" as const, className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-700" },
    cancelled: { label: "Frais d'annulation", variant: "outline" as const, className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-700" },
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

const getRowClassName = (transactionType: string, status: string): string => {
  const baseClass = "hover:shadow-sm transition-shadow";
  switch (transactionType) {
    case 'regular_earning':
    case 'booking_payout':
      return status === 'completed' ? `${baseClass} bg-green-50/50` : baseClass;
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
      <div className="border border-border rounded-lg overflow-hidden">
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
            {[...Array(7)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    <div className="border border-border rounded-lg overflow-hidden">
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
            <TableRow key={payout.id} className={getRowClassName(payout.transaction_type, payout.status)}>
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
  );
}
