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
  Clock, 
  Receipt 
} from "lucide-react";
import { subMonths, startOfMonth, addMonths } from "date-fns";
import type { HostEarningsReport } from "./types/earnings";

interface DashboardEarningsSummaryProps {
  userId: string;
}

const DashboardEarningsSummary = ({ userId }: DashboardEarningsSummaryProps) => {
  const navigate = useNavigate();
  
  // Use the same date range as the earnings report default (last 12 months)
  const defaultEndMonth = startOfMonth(addMonths(new Date(), 1));
  const defaultStartMonth = startOfMonth(subMonths(defaultEndMonth, 12));

  // Fetch earnings report data (same source as earnings report page)
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

  // Fetch pending payouts and fees paid separately
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

  // Calculate summary data from reports (same logic as HostEarningsReport.tsx)
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

    const totalGrossRevenue = reports.reduce(
      (sum, r) => sum + Number(r.gross_earnings),
      0
    );

    const actualNetRevenue = reports.reduce(
      (sum, r) => sum + Number(r.actual_net_earnings),
      0
    );

    const hostFeesPaid = reports.reduce(
      (sum, r) => sum + Number(r.platform_fees),
      0
    );

    const totalNights = reports.reduce(
      (sum, r) => sum + Number(r.nights_booked),
      0
    );

    // Calculate weighted average rate (weighted by nights booked)
    const weightedRate = reports.reduce(
      (sum, r) =>
        sum + Number(r.average_nightly_rate) * Number(r.nights_booked),
      0
    );

    const averageRate = totalNights > 0 ? weightedRate / totalNights : 0;

    // Calculate weighted average occupancy (weighted by nights booked)
    const weightedOccupancy = reports.reduce(
      (sum, r) =>
        sum + Number(r.occupancy_percentage) * Number(r.nights_booked),
      0
    );

    const occupancyRate = totalNights > 0 ? weightedOccupancy / totalNights : 0;

    return {
      totalGrossRevenue,
      averageRate,
      actualNetRevenue,
      occupancyRate,
      hostFeesPaid,
    };
  }, [reports]);

  const formatCurrency = (value: number, showCents: boolean = false) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
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

  // Empty state (new host with no data)
  const hasNoData = !reports || reports.length === 0;
  if (!isLoading && hasNoData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg mb-2">
          No earnings data yet
        </p>
        <p className="text-sm text-muted-foreground">
          Start accepting bookings to see your performance metrics
        </p>
      </div>
    );
  }

  const metrics = [
    {
      label: "Occupancy Rate",
      value: formatPercentage(summaryData.occupancyRate),
      icon: TrendingUp,
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-600",
      href: "/host/earnings-report",
    },
    {
      label: "Average Rate",
      value: formatCurrency(summaryData.averageRate, true),
      icon: DollarSign,
      bgColor: "bg-green-500/10",
      iconColor: "text-green-600",
      href: "/host/earnings-report",
    },
    {
      label: "Gross Revenue",
      value: formatCurrency(summaryData.totalGrossRevenue),
      icon: ArrowUpCircle,
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-600",
      href: "/host/earnings-report",
    },
    {
      label: "Net Revenue",
      value: formatCurrency(summaryData.actualNetRevenue),
      icon: Wallet,
      bgColor: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      href: "/host/earnings-report",
    },
    {
      label: "Pending Payouts",
      value: formatCurrency(Number(payoutData?.pending_payouts || 0)),
      icon: Clock,
      bgColor: "bg-amber-500/10",
      iconColor: "text-amber-600",
      href: "/host/payouts",
    },
    {
      label: "Fees Paid",
      value: formatCurrency(summaryData.hostFeesPaid),
      icon: Receipt,
      bgColor: "bg-slate-500/10",
      iconColor: "text-slate-600",
      href: "/host/earnings-report",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card 
            key={index} 
            className="bg-card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(metric.href)}
          >
            <CardContent className="p-6">
              <div className={`inline-flex p-3 rounded-lg ${metric.bgColor} mb-4`}>
                <Icon className={`h-5 w-5 ${metric.iconColor}`} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardEarningsSummary;
