import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, CheckCircle, TrendingUp, Clock, XCircle, AlertTriangle } from "lucide-react";

interface AdminKPIs {
  total_revenue: number;
  active_bookings: number;
  occupancy_rate: number;
  pending_listings: number;
  cancelled_bookings: number;
  open_disputes: number;
}

export default function AdminDashboardOverview() {
  const navigate = useNavigate();
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_dashboard_kpis");
      if (error) throw error;
      return data?.[0] as AdminKPIs;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load dashboard metrics</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: `$${kpis?.total_revenue?.toFixed(0) || "0"}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
      href: "/admin/reports",
    },
    {
      title: "Active Bookings",
      value: kpis?.active_bookings || 0,
      icon: CheckCircle,
      color: "text-primary",
      bgColor: "bg-primary/10",
      href: "/admin/bookings",
    },
    {
      title: "Occupancy Rate",
      value: `${kpis?.occupancy_rate?.toFixed(1) || "0"}%`,
      icon: TrendingUp,
      color: "text-info",
      bgColor: "bg-info/10",
      href: "/admin/reports",
    },
    {
      title: "Pending Listings",
      value: kpis?.pending_listings || 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      href: "/admin/listings",
    },
    {
      title: "Cancelled Bookings",
      value: kpis?.cancelled_bookings || 0,
      icon: XCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      href: "/admin/bookings",
    },
    {
      title: "Open Disputes",
      value: kpis?.open_disputes || 0,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      href: "/admin/disputes",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card 
          key={stat.title}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate(stat.href)}
        >
          <CardContent className="p-4">
            <div className="flex flex-col">
              <p className="text-xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
