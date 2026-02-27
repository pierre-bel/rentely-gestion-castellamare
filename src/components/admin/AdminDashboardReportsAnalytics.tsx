import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeeklyRevenue, WeeklyBookings } from "./types/analytics";

const AdminDashboardReportsAnalytics = () => {
  // Fetch weekly revenue
  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery<WeeklyRevenue[]>({
    queryKey: ["admin-weekly-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_weekly_revenue", {
        weeks_back: 4
      });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch weekly bookings
  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery<WeeklyBookings[]>({
    queryKey: ["admin-weekly-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_weekly_bookings", {
        weeks_back: 4
      });
      if (error) throw error;
      return data || [];
    },
  });

  // Chart configurations
  const revenueChartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(179, 52%, 16%)", // Primary teal
    },
  } satisfies ChartConfig;

  const bookingsChartConfig = {
    booking_count: {
      label: "Bookings",
      color: "hsl(142, 71%, 45%)", // Success green
    },
  } satisfies ChartConfig;

  // Loading states
  if (isLoadingRevenue || isLoadingBookings) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Revenue Over Time Chart */}
      <div>
        <h3 className="text-base font-semibold mb-4">Revenue Over Time</h3>
        <ChartContainer config={revenueChartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week_label" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                className="text-muted-foreground"
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => 
                      new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(value as number)
                    }
                  />
                }
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={{ fill: "var(--color-revenue)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Booking Trend Chart */}
      <div>
        <h3 className="text-base font-semibold mb-4">Booking Trend (Weekly)</h3>
        <ChartContainer config={bookingsChartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bookingsData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week_label" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                className="text-muted-foreground"
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => `${value} bookings`}
                  />
                }
              />
              <Bar 
                dataKey="booking_count" 
                fill="var(--color-booking_count)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

export default AdminDashboardReportsAnalytics;
