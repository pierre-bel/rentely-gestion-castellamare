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

interface DashboardEarningsSummaryProps {
  userId: string;
}

const ACTIVE_STATUSES = ["confirmed", "completed", "pending_payment"];

const DashboardEarningsSummary = ({ userId }: DashboardEarningsSummaryProps) => {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ["host-dashboard-ytd-summary", userId, year],
    queryFn: async () => {
      const { data: listings, error: lErr } = await supabase
        .from("listings")
        .select("id")
        .eq("host_user_id", userId);
      if (lErr) throw lErr;
      const listingIds = (listings || []).map((l) => l.id);
      if (listingIds.length === 0) return { listingsCount: 0, bookings: [], items: [] };

      const bookings: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data: b, error } = await supabase
          .from("bookings")
          .select("id, total_price, cleaning_fee, nights")
          .in("listing_id", listingIds)
          .in("status", ACTIVE_STATUSES as any)
          .gte("checkin_date", `${year}-01-01`)
          .lte("checkin_date", `${year}-12-31`)
          .range(from, from + 999);
        if (error) throw error;
        bookings.push(...(b || []));
        if (!b || b.length < 1000) break;
      }

      const items: any[] = [];
      const ids = bookings.map((b) => b.id);
      for (let i = 0; i < ids.length; i += 100) {
        const { data: it, error } = await supabase
          .from("booking_payment_items")
          .select("amount, is_paid")
          .in("booking_id", ids.slice(i, i + 100));
        if (error) throw error;
        items.push(...(it || []));
      }
      return { listingsCount: listingIds.length, bookings, items };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const reports = data?.bookings;

  const summaryData = useMemo(() => {
    const bookings = data?.bookings || [];
    const totalGrossRevenue = bookings.reduce((s, b) => s + Number(b.total_price || 0), 0);
    const totalCleaning = bookings.reduce((s, b) => s + Number(b.cleaning_fee || 0), 0);
    const totalNights = bookings.reduce((s, b) => s + Number(b.nights || 0), 0);
    const actualNetRevenue = totalGrossRevenue - totalCleaning;
    const averageRate = totalNights > 0 ? actualNetRevenue / totalNights : 0;
    const daysInYear = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
    const capacity = (data?.listingsCount || 0) * daysInYear;
    const occupancyRate = capacity > 0 ? (totalNights / capacity) * 100 : 0;
    const remaining = (data?.items || [])
      .filter((i) => !i.is_paid)
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    return { totalGrossRevenue, averageRate, actualNetRevenue, occupancyRate, remaining };
  }, [data, year]);

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
      label: "Reste à encaisser",
      value: formatCurrency(summaryData.remaining),
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
