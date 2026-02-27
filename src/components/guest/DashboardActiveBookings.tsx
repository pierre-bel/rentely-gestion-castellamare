import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { DashboardBookingCard } from "./DashboardBookingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useDemoData } from "@/hooks/useDemoData";

interface DashboardActiveBookingsProps {
  userId: string;
  onCancelBooking: (booking: any) => void;
  onMessageHost: (booking: any) => void;
  onContactSupport: (booking: any) => void;
}

const DashboardActiveBookings = ({
  userId,
  onCancelBooking,
  onMessageHost,
  onContactSupport,
}: DashboardActiveBookingsProps) => {
  const { isDemoMode, migrationComplete, getBookings } = useDemoData();

  const { data: dbBookings, isLoading: dbLoading } = useQuery({
    queryKey: ["dashboard-active-bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          listings (
            id, title, address, city, state, country, 
            cover_image, type, size_sqft, host_user_id
          )
        `)
        .eq("guest_user_id", userId)
        .gte("checkout_date", new Date().toISOString().split("T")[0])
        .not("status", "in", '("completed","cancelled_guest","cancelled_host")')
        .order("checkin_date", { ascending: true })
        .limit(2);

      if (error) throw error;
      return (data || []).filter((b) => b.listings !== null);
    },
    enabled: !isDemoMode,
  });

  const { data: demoBookings, isLoading: demoLoading } = useQuery({
    queryKey: ["demo-dashboard-active-bookings", userId, migrationComplete],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const bookings = getBookings();
      
      return bookings
        .filter((b: any) => 
          b.checkout_date >= today &&
          !["completed", "cancelled_guest", "cancelled_host"].includes(b.status)
        )
        .sort((a: any, b: any) => a.checkin_date.localeCompare(b.checkin_date))
        .slice(0, 2);
    },
    enabled: isDemoMode && migrationComplete,
  });

  const activeBookings = isDemoMode ? demoBookings : dbBookings;
  const isLoading = isDemoMode ? demoLoading : dbLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Active Bookings</CardTitle>
          <TextLinkButton href="/guest/bookings">View All</TextLinkButton>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-6 pb-6">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 border-b space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : activeBookings && activeBookings.length > 0 ? (
          <div className="px-6 pb-6">
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {activeBookings.map((booking) => (
                <DashboardBookingCard
                  key={booking.id}
                  booking={booking}
                  onCancelBooking={onCancelBooking}
                  onMessageHost={onMessageHost}
                  onContactSupport={onContactSupport}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Bookings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have any upcoming bookings right now
            </p>
            <Button variant="outline" asChild>
              <Link to="/search">Browse Listings</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardActiveBookings;
