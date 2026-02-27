import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { DashboardBookingCard } from "./DashboardBookingCard";
import { ReviewDialog } from "@/components/guest/ReviewDialog";
import { useDemoData } from "@/hooks/useDemoData";

interface PastBooking {
  id: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  guests: number;
  total_price: number;
  status: string;
  listings: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string | null;
    country: string;
    cover_image: string | null;
    type: string;
    size_sqft: number | null;
    host_user_id: string;
  };
  reviews: Array<{
    id: string;
    rating: number;
    text: string;
    created_at: string;
    status: string;
  }>;
}

const DashboardPastBookings = ({ userId }: { userId: string }) => {
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PastBooking | null>(null);
  const { isDemoMode, migrationComplete, getBookings, getReviews } = useDemoData();

  const { data: dbBookings, isLoading: dbLoading, refetch: dbRefetch } = useQuery({
    queryKey: ["dashboard-past-bookings", userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          checkin_date,
          checkout_date,
          nights,
          guests,
          total_price,
          status,
          listings!inner(
            id,
            title,
            address,
            city,
            state,
            country,
            cover_image,
            type,
            size_sqft,
            host_user_id
          ),
          reviews!left(
            id,
            rating,
            text,
            created_at,
            status,
            author_user_id
          )
        `)
        .eq("guest_user_id", userId)
        .or(`status.eq.completed,checkout_date.lt.${today}`)
        .order("checkout_date", { ascending: false })
        .limit(3);

      if (error) throw error;
      
      const filteredData = (data || []).map((booking: any) => ({
        ...booking,
        reviews: (booking.reviews || []).filter((review: any) => review.author_user_id === userId)
      }));
      
      return filteredData as PastBooking[];
    },
    enabled: !isDemoMode,
  });

  const { data: demoBookings, isLoading: demoLoading, refetch: demoRefetch } = useQuery({
    queryKey: ["demo-dashboard-past-bookings", userId, migrationComplete],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const bookings = getBookings();
      
      const pastBookings = bookings
        .filter((b: any) => 
          b.status === "completed" || b.checkout_date < today
        )
        .sort((a: any, b: any) => b.checkout_date.localeCompare(a.checkout_date))
        .slice(0, 3);
      
      // Fetch reviews for these bookings from demo storage
      const bookingIds = pastBookings.map((b: any) => b.id);
      const allReviews = getReviews(bookingIds);
      
      // Map reviews to bookings
      return pastBookings.map((b: any) => ({
        ...b,
        reviews: allReviews.filter((r: any) => r.booking_id === b.id && r.author_user_id === userId)
      }));
    },
    enabled: isDemoMode && migrationComplete,
  });

  const pastBookings = isDemoMode ? demoBookings : dbBookings;
  const isLoading = isDemoMode ? demoLoading : dbLoading;
  const refetch = isDemoMode ? demoRefetch : dbRefetch;

  const handleReviewAction = (booking: PastBooking) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const handleReviewSubmitted = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Past Bookings</CardTitle>
          <TextLinkButton href="/guest/bookings?filter=past">View All</TextLinkButton>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pastBookings || pastBookings.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Past Bookings</CardTitle>
          <TextLinkButton href="/guest/bookings?filter=past">View All</TextLinkButton>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <p className="text-muted-foreground">No past bookings yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Past Bookings</CardTitle>
          <TextLinkButton href="/guest/bookings?filter=past">View All</TextLinkButton>
        </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="space-y-4">
            {pastBookings.map((booking) => {
              const hasReview = booking.reviews && booking.reviews.length > 0;
              
              return (
                <DashboardBookingCard
                  key={booking.id}
                  booking={booking}
                  showReviewButton={true}
                  hasReview={hasReview}
                  onReviewAction={() => handleReviewAction(booking)}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedBooking && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          bookingId={selectedBooking.id}
          listingTitle={selectedBooking.listings.title}
          existingReview={
            selectedBooking.reviews && selectedBooking.reviews.length > 0
              ? selectedBooking.reviews[0]
              : null
          }
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </>
  );
};

export default DashboardPastBookings;
