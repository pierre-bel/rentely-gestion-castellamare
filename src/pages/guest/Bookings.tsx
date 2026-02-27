import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isPast, format, parseISO, startOfDay, differenceInCalendarDays } from "date-fns";
import { Loader2, Home, Search, Calendar, MapPin, Users, MessageSquare, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link, useNavigate } from "react-router-dom";
import { ReviewDialog } from "@/components/guest/ReviewDialog";
import { CancelBookingDialog } from "@/components/guest/CancelBookingDialog";
import { CreateDisputeDialog } from "@/components/dispute/CreateDisputeDialog";
import AccountRestrictionBanner from "@/components/guest/AccountRestrictionBanner";
import { useDemoData } from "@/hooks/useDemoData";

interface CancellationPolicySnapshot {
  policy_key: string;
  name: string;
  description: string;
  refund_percentage: number;
  days_before_checkin: number;
}

interface Booking {
  id: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  guests: number;
  total_price: number;
  status: string;
  created_at: string;
  cancellation_policy_snapshot?: CancellationPolicySnapshot;
  listings: {
    id: string;
    title: string;
    city: string;
    country: string;
    cover_image: string;
    host_user_id: string;
  } | null;
}

const Bookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isDemoMode, getBookings, updateBooking, addTransaction, getOrCreateThread, storeProfile, getDisputeForBooking, createDisputeWithSupportThread, getReviews } = useDemoData();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingReviews, setBookingReviews] = useState<Record<string, any>>({});
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [bookingForDispute, setBookingForDispute] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isDemoMode) {
      // Get bookings from localStorage for demo mode
      const demoBookings = getBookings();
      setBookings(demoBookings as any[]);
      
      // Fetch reviews for demo bookings
      const bookingIds = demoBookings.map((b: any) => b.id);
      const demoReviews = getReviews(bookingIds);
      const reviewsMap: Record<string, any> = {};
      demoReviews.forEach((review: any) => {
        reviewsMap[review.booking_id] = review;
      });
      setBookingReviews(reviewsMap);
      
      setLoading(false);
      return;
    }

    // Regular DB fetch for non-demo users
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        listings (
          id,
          title,
          city,
          country,
          cover_image,
          host_user_id
        )
      `)
      .eq("guest_user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Filter out bookings with null listings
      const validBookings = (data as any[]).filter(b => b.listings !== null);
      setBookings(validBookings);

      // Fetch reviews for all bookings
      const bookingIds = data.map((b) => b.id);
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*")
        .in("booking_id", bookingIds)
        .eq("author_user_id", user.id);

      if (reviewsData) {
        const reviewsMap: Record<string, any> = {};
        reviewsData.forEach((review) => {
          reviewsMap[review.booking_id] = review;
        });
        setBookingReviews(reviewsMap);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [user, isDemoMode]);

  const handleReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const handleReviewSubmitted = () => {
    // Refresh reviews based on mode
    if (isDemoMode) {
      // Demo mode: reload from localStorage
      const bookingIds = bookings.map((b) => b.id);
      const demoReviews = getReviews(bookingIds);
      const reviewsMap: Record<string, any> = {};
      demoReviews.forEach((review: any) => {
        reviewsMap[review.booking_id] = review;
      });
      setBookingReviews(reviewsMap);
    } else {
      // Real mode: reload from Supabase
      if (user) {
        supabase
          .from("reviews")
          .select("*")
          .in("booking_id", bookings.map((b) => b.id))
          .eq("author_user_id", user.id)
          .then(({ data }) => {
            if (data) {
              const reviewsMap: Record<string, any> = {};
              data.forEach((review) => {
                reviewsMap[review.booking_id] = review;
              });
              setBookingReviews(reviewsMap);
            }
          });
      }
    }
  };

  const handleMessageHost = async (booking: Booking) => {
    if (!user?.id || !booking.listings) return;
    
    try {
      // Demo mode: use localStorage
      if (isDemoMode) {
        // Fetch host profile first
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .eq('id', booking.listings.host_user_id)
          .single();
        
        // Store the profile in demo storage
        storeProfile(booking.listings.host_user_id, hostProfile || {
          id: booking.listings.host_user_id,
          first_name: 'Host',
          last_name: `#${booking.listings.host_user_id.substring(0, 8)}`,
          email: null,
          avatar_url: null
        });
        
        // Now create the thread
        const threadId = getOrCreateThread(
          booking.listings.host_user_id,
          booking.id,
          booking.listings.id
        );
        
        if (!threadId) {
          throw new Error('Failed to create thread');
        }
        
        // Navigate to inbox with thread pre-selected
        navigate('/guest/inbox', { 
          state: { threadId: threadId }
        });
        return;
      }
      
      // Real mode: Call RPC to get or create thread with booking context
      const { data, error } = await supabase.rpc('get_or_create_thread', {
        p_participant_1_id: user.id,
        p_participant_2_id: booking.listings.host_user_id,
        p_booking_id: booking.id,
        p_listing_id: booking.listings.id
      });
      
      if (error) throw error;
      
      const threadId = data;
      
      // Navigate to inbox with thread pre-selected
      navigate('/guest/inbox', { 
        state: { threadId: threadId }
      });
      
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        title: "Error",
        description: "Failed to open conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactSupport = async (booking: Booking) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Demo mode: use localStorage
      if (isDemoMode) {
        const existingDispute = getDisputeForBooking(booking.id);
        
        if (existingDispute?.support_thread_id) {
          // Navigate to existing support chat
          navigate("/guest/inbox", {
            state: { threadId: existingDispute.support_thread_id },
          });
        } else {
          // Open dispute creation dialog
          setBookingForDispute(booking);
          setDisputeDialogOpen(true);
        }
        return;
      }

      // Real mode: check database for existing dispute
      const { data: existingDispute } = await supabase
        .from("disputes")
        .select("id, support_thread_id")
        .eq("booking_id", booking.id)
        .eq("initiated_by_user_id", currentUser.id)
        .in("status", ["open", "in_progress", "escalated"])
        .maybeSingle();

      if (existingDispute?.support_thread_id) {
        navigate("/guest/inbox", {
          state: { threadId: existingDispute.support_thread_id },
        });
      } else {
        setBookingForDispute(booking);
        setDisputeDialogOpen(true);
      }
    } catch (error) {
      console.error("Error checking for disputes:", error);
      toast({
        title: "Error",
        description: "Failed to contact support. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFilteredBookings = (bookingsList: Booking[]) => {
    if (!searchQuery.trim()) return bookingsList;

    const query = searchQuery.toLowerCase();
    return bookingsList.filter(
      (booking) =>
        booking.listings &&
        (booking.listings.title.toLowerCase().includes(query) ||
        booking.listings.city.toLowerCase().includes(query) ||
        booking.listings.country.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query))
    );
  };

  const activeBookings = bookings.filter(
    (b) =>
      b.listings &&
      !isPast(new Date(b.checkout_date)) &&
      !["completed", "cancelled_guest", "cancelled_host"].includes(b.status)
  );

  const pastBookings = bookings.filter(
    (b) =>
      b.listings &&
      (isPast(new Date(b.checkout_date)) ||
      ["completed", "cancelled_guest", "cancelled_host"].includes(b.status))
  );

  const filteredActiveBookings = getFilteredBookings(activeBookings);
  const filteredPastBookings = getFilteredBookings(pastBookings);


  const getStatusLabel = (status: string) => {
    if (status === "pending_payment") {
      return "Pending Confirmation";
    }
    return status.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const handleCancelBooking = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!bookingToCancel || !user) return;

    try {
      // Demo mode handling - process locally
      if (isDemoMode) {
        // Calculate cancellation details locally
        const checkinDate = parseISO(bookingToCancel.checkin_date);
        const today = startOfDay(new Date());
        const daysUntilCheckin = differenceInCalendarDays(checkinDate, today);
        
        const policy = bookingToCancel.cancellation_policy_snapshot;
        if (!policy) throw new Error('No cancellation policy found');
        
        // Calculate refund
        const isRefundEligible = daysUntilCheckin >= policy.days_before_checkin;
        const refundPercentage = isRefundEligible ? policy.refund_percentage : 0;
        const refundAmount = (bookingToCancel.total_price * refundPercentage) / 100;
        
        // Update booking status in localStorage
        updateBooking(bookingToCancel.id, {
          status: 'cancelled_guest',
          updated_at: new Date().toISOString()
        });
        
        // Create refund transaction if applicable
        if (refundAmount > 0) {
          addTransaction({
            id: crypto.randomUUID(),
            booking_id: bookingToCancel.id,
            type: 'refund',
            amount: refundAmount,
            currency: 'USD',
            status: 'succeeded',
            provider: 'stripe',
            created_at: new Date().toISOString(),
            dispute_id: null,
            bookings: {
              id: bookingToCancel.id,
              checkin_date: bookingToCancel.checkin_date,
              checkout_date: bookingToCancel.checkout_date,
              nights: bookingToCancel.nights,
              guests: bookingToCancel.guests,
              guest_user_id: user.id,
              listings: bookingToCancel.listings
            },
            disputes: null
          });
        }
        
        // Update UI optimistically
        setBookings(prev => prev.map(b => 
          b.id === bookingToCancel.id 
            ? { ...b, status: 'cancelled_guest', updated_at: new Date().toISOString() }
            : b
        ));
        
        // Show success toast
        toast({
          title: "Booking Cancelled",
          description: refundAmount > 0 
            ? `Your booking has been cancelled. A ${refundPercentage}% refund of $${refundAmount.toFixed(2)} will be processed (${daysUntilCheckin} days before check-in).`
            : "Your booking has been cancelled. No refund is available based on the cancellation policy.",
        });
        
        setCancelDialogOpen(false);
        return; // Exit early for demo mode
      }

      // Real mode - Call RPC function to cancel booking with refund calculation
      const { data: result, error: rpcError } = await supabase
        .rpc('cancel_booking_with_refund', {
          p_booking_id: bookingToCancel.id,
          p_user_id: user.id,
          p_cancellation_reason: null
        });

      if (rpcError) throw rpcError;

      const cancellationResult = result as {
        status: string;
        booking_id: string;
        cancelled_by: string;
        host_payout_net: number;
        refund_percentage: number;
        days_until_checkin: number;
        guest_refund_amount: number;
        host_retained_gross: number;
        commission_on_retention: number;
      };

      // Check if cancellation was successful by verifying status
      if (!cancellationResult?.status || !cancellationResult.status.startsWith('cancelled')) {
        throw new Error('Failed to cancel booking');
      }

      // Optimistically update the UI immediately
      setBookings(prev => prev.map(b => 
        b.id === bookingToCancel.id 
          ? { ...b, status: cancellationResult.status as any }
          : b
      ));

      // Show success message with refund details
      const refundAmount = cancellationResult.guest_refund_amount || 0;
      const refundPercentage = cancellationResult.refund_percentage || 0;
      toast({
        title: "Booking Cancelled",
        description: refundAmount > 0 
          ? `Your booking has been cancelled. A ${refundPercentage}% refund of $${refundAmount.toFixed(2)} will be processed (${cancellationResult.days_until_checkin} days before check-in).`
          : "Your booking has been cancelled. No refund is available based on the cancellation policy.",
      });

      setCancelDialogOpen(false);
      
      // Verify server updated status, then refresh
      try {
        for (let i = 0; i < 3; i++) {
          const { data: verify } = await supabase
            .from('bookings')
            .select('status')
            .eq('id', bookingToCancel.id)
            .maybeSingle();
          if (verify?.status === 'cancelled_guest') break;
          await new Promise((res) => setTimeout(res, 400));
        }
      } finally {
        fetchBookings();
      }
    } catch (error: any) {
      console.error('Cancellation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const EmptyState = ({ isActive }: { isActive: boolean }) => (
    <Card>
      <CardContent className="p-12 text-center">
        <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          {isActive ? "No active bookings" : "No past bookings"}
        </h3>
        <p className="text-muted-foreground mb-4">
          {isActive
            ? "Start exploring amazing properties and make your first booking"
            : "Your completed and cancelled bookings will appear here"}
        </p>
        {isActive && (
          <Button asChild>
            <Link to="/search">Browse Listings</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 pb-8 lg:px-8">
      {/* Account Restriction Banner */}
      <AccountRestrictionBanner />
      
      <Tabs defaultValue={activeBookings.length > 0 ? "active" : "past"} className="w-full">
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs Toggle */}
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="space-y-4 mt-0">
            {filteredActiveBookings.length === 0 ? (
              searchQuery ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">
                      No bookings found matching "{searchQuery}"
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState isActive={true} />
              )
            ) : (
              filteredActiveBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="h-32 w-32 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={booking.listings!.cover_image}
                          alt={booking.listings!.title}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {booking.listings!.title}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {booking.listings!.city}, {booking.listings!.country}
                              </span>
                            </div>
                          </div>
                          <StatusBadge status={booking.status as any} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" />
                              <span>Check-in</span>
                            </div>
                            <p className="font-medium">
                              {format(new Date(booking.checkin_date), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" />
                              <span>Check-out</span>
                            </div>
                            <p className="font-medium">
                              {format(new Date(booking.checkout_date), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Users className="h-3 w-3" />
                              <span>Guests</span>
                            </div>
                            <p className="font-medium">{booking.guests}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Total</p>
                            <p className="font-semibold text-lg">
                              ${booking.total_price.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center gap-2 mt-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/listing/${booking.listings!.id}`}>View Property</Link>
                            </Button>
                            {booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMessageHost(booking)}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Message Host
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleContactSupport(booking)}
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Contact Support
                            </Button>
                          </div>
                          {booking.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelBooking(booking)}
                              className="border-destructive text-destructive bg-white hover:bg-destructive hover:text-white hover:border-destructive"
                            >
                              Cancel Booking
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-0">
          {filteredPastBookings.length === 0 ? (
            searchQuery ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No bookings found matching "{searchQuery}"
                  </p>
                </CardContent>
              </Card>
            ) : (
              <EmptyState isActive={false} />
            )
          ) : (
            filteredPastBookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="h-32 w-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={booking.listings!.cover_image}
                        alt={booking.listings!.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">
                            {booking.listings!.title}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {booking.listings!.city}, {booking.listings!.country}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={booking.status as any} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>Check-in</span>
                          </div>
                          <p className="font-medium">
                            {format(new Date(booking.checkin_date), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>Check-out</span>
                          </div>
                          <p className="font-medium">
                            {format(new Date(booking.checkout_date), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Users className="h-3 w-3" />
                            <span>Guests</span>
                          </div>
                          <p className="font-medium">{booking.guests}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Total</p>
                          <p className="font-semibold text-lg">
                            ${booking.total_price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/listing/${booking.listings!.id}`}>View Property</Link>
                        </Button>
                        {booking.status === 'completed' && !bookingReviews[booking.id] && (
                          <Button size="sm" onClick={() => handleReview(booking)}>
                            Leave Review
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleContactSupport(booking)}
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Contact Support
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <ReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        bookingId={selectedBooking?.id || ""}
        listingTitle={selectedBooking?.listings?.title || ""}
        onReviewSubmitted={handleReviewSubmitted}
      />

      <CancelBookingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        booking={bookingToCancel}
        onConfirm={handleCancelConfirm}
      />

      {bookingForDispute && (
        <CreateDisputeDialog
          open={disputeDialogOpen}
          onOpenChange={(open) => {
            setDisputeDialogOpen(open);
            if (!open) {
              fetchBookings();
            }
          }}
          bookingId={bookingForDispute.id}
          listingTitle={bookingForDispute.listings!.title}
        />
      )}
    </div>
  );
};

export default Bookings;
