import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  DollarSign, 
  ArrowUpCircle, 
  Wallet, 
  Clock
} from "lucide-react";
import { subMonths, startOfMonth, addMonths } from "date-fns";
import type { HostEarningsReport } from "./types/earnings";

interface DashboardEarningsSummaryProps {
  userId: string;
}

const DashboardEarningsSummary = ({ userId }: DashboardEarningsSummaryProps) => {
  const navigate = useNavigate();
  
  const now = new Date();
  const defaultStartMonth = new Date(now.getFullYear(), 0, 1); // Jan 1st of current year
  const defaultEndMonth = startOfMonth(addMonths(now, 1));

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["host-dashboard-earnings-report", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_host_earnings_report", {
        p_host_user_id: userId,
        p_start_month: defaultStartMonth.toISOString().split("T")[0],
        p_end_month: defaultEndMonth.toISOString().split("T")[0],
        p_search_query: null,
        p_listing_ids: null,
        p_min_gross: null,
        p_max_gross: null,
        p_min_net: null,
        p_max_net: null,
        p_sort_by: "month_date",
        p_sort_order: "desc",
      });
      if (error) throw error;
      return data as unknown as HostEarningsReport[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: payoutData, isLoading: payoutsLoading } = useQuery({
    queryKey: ["host-dashboard-payouts", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_host_dashboard_kpis", {
        p_host_user_id: userId,
      });
      if (error) throw error;
      return data[0] as { pending_payouts: number; host_fees_paid: number };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = reportsLoading || payoutsLoading;

  const summaryData = useMemo(() => {
    if (!reports || reports.length === 0) {
      return {
        totalGrossRevenue: 0,
        averageRate: 0,
        actualNetRevenue: 0,
        occupancyRate: 0,
        hostFeesPaid: 0,
      };
    }

    const totalGrossRevenue = reports.reduce((sum, r) => sum + Number(r.gross_earnings), 0);
    const actualNetRevenue = reports.reduce((sum, r) => sum + Number(r.actual_net_earnings), 0);
    const hostFeesPaid = reports.reduce((sum, r) => sum + Number(r.platform_fees), 0);
    const totalNights = reports.reduce((sum, r) => sum + Number(r.nights_booked), 0);
    const weightedRate = reports.reduce((sum, r) => sum + Number(r.average_nightly_rate) * Number(r.nights_booked), 0);
    const averageRate = totalNights > 0 ? weightedRate / totalNights : 0;
    const weightedOccupancy = reports.reduce((sum, r) => sum + Number(r.occupancy_percentage) * Number(r.nights_booked), 0);
    const occupancyRate = totalNights > 0 ? weightedOccupancy / totalNights : 0;

    return { totalGrossRevenue, averageRate, actualNetRevenue, occupancyRate, hostFeesPaid };
  }, [reports]);

  const formatCurrency = (value: number, showCents: boolean = false) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-muted/5">
            <CardContent className="p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasNoData = !reports || reports.length === 0;
  if (!isLoading && hasNoData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg mb-2">Aucune donnée de revenus</p>
        <p className="text-sm text-muted-foreground">
          Commencez à accepter des réservations pour voir vos indicateurs
        </p>
      </div>
    );
  }

  const metrics = [
    {
      label: "Taux d'occupation",
      value: formatPercentage(summaryData.occupancyRate),
      icon: TrendingUp,
      bgColor: "bg-accent-cool/15",
      iconColor: "text-accent-cool",
      borderColor: "hover:border-accent-cool/30",
      href: "/host/earnings-report",
    },
    {
      label: "Tarif moyen",
      value: formatCurrency(summaryData.averageRate, true),
      icon: DollarSign,
      bgColor: "bg-success/15",
      iconColor: "text-success",
      borderColor: "hover:border-success/30",
      href: "/host/earnings-report",
    },
    {
      label: "Revenus bruts",
      value: formatCurrency(summaryData.totalGrossRevenue),
      icon: ArrowUpCircle,
      bgColor: "bg-accent-purple/15",
      iconColor: "text-accent-purple",
      borderColor: "hover:border-accent-purple/30",
      href: "/host/earnings-report",
    },
    {
      label: "Revenus nets",
      value: formatCurrency(summaryData.actualNetRevenue),
      icon: Wallet,
      bgColor: "bg-primary/15",
      iconColor: "text-primary",
      borderColor: "hover:border-primary/30",
      href: "/host/earnings-report",
    },
    {
      label: "Versements en attente",
      value: formatCurrency(Number(payoutData?.pending_payouts || 0)),
      icon: Clock,
      bgColor: "bg-accent-warm/15",
      iconColor: "text-accent-warm",
      borderColor: "hover:border-accent-warm/30",
      href: "/host/payouts",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card 
            key={index} 
            className={`bg-card border transition-all cursor-pointer hover:shadow-md ${metric.borderColor}`}
            onClick={() => navigate(metric.href)}
          >
            <CardContent className="p-3 md:p-6">
              <div className={`inline-flex p-2 md:p-3 rounded-xl ${metric.bgColor} mb-2 md:mb-4`}>
                <Icon className={`h-4 w-4 md:h-5 md:w-5 ${metric.iconColor}`} />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mb-0.5 md:mb-1">{metric.label}</p>
              <p className="text-lg md:text-2xl font-bold text-foreground">{metric.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardEarningsSummary;
