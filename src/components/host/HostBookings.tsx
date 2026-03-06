import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useDemoData } from "@/hooks/useDemoData";
import { BookingsFiltersSheet } from "./BookingsFiltersSheet";
import { BookingsTable } from "./BookingsTable";
import { CreateDisputeDialog } from "@/components/dispute/CreateDisputeDialog";
import { CreateManualBookingDialog } from "./CreateManualBookingDialog";
import { EditManualBookingDialog } from "./EditManualBookingDialog";
import { BookingDetailDialog, type BookingDetailData } from "./BookingDetailDialog";
import { ImportBookingsDialog } from "./ImportBookingsDialog";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";

interface Booking {
  id: string;
  listing_id: string;
  listing_title: string;
  guest_user_id: string;
  guest_name: string | null;
  guest_email: string;
  guest_avatar: string | null;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  guests: number;
  host_payout_gross: number;
  status: "confirmed" | "pending_payment" | "cancelled" | "completed" | "cancelled_guest" | "cancelled_host" | "expired";
  created_at: string;
}

export default function HostBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDemoMode, migrationComplete, getHostBookingsFiltered, updateBooking, getDisputeForBooking, getOrCreateThread, storeProfile } = useDemoData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [checkinStart, setCheckinStart] = useState<Date | undefined>();
  const [checkinEnd, setCheckinEnd] = useState<Date | undefined>();
  const [checkoutStart, setCheckoutStart] = useState<Date | undefined>();
  const [checkoutEnd, setCheckoutEnd] = useState<Date | undefined>();
  const [sortValue, setSortValue] = useState("created_at-desc");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [bookingForDispute, setBookingForDispute] = useState<Booking | null>(null);
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [editBookingOpen, setEditBookingOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<any>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<BookingDetailData | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: [
      "host-bookings",
      user?.id,
      debouncedSearch,
      statusFilter,
      minPrice,
      maxPrice,
      checkinStart,
      checkinEnd,
      checkoutStart,
      checkoutEnd,
      sortValue,
      isDemoMode,
    ],
    queryFn: async () => {
      if (!user?.id) return [];

      if (isDemoMode) {
        // DEMO MODE: Use localStorage with client-side filtering
        if (!migrationComplete) {
          console.log('⏳ Waiting for migration to complete...');
          return [];
        }

        const [sortBy, sortOrder] = sortValue.split("-");
        
        return getHostBookingsFiltered({
          searchQuery: debouncedSearch || null,
          statusFilter: statusFilter !== "all" ? statusFilter : null,
          minPrice: minPrice ? parseFloat(minPrice) : null,
          maxPrice: maxPrice ? parseFloat(maxPrice) : null,
          checkinStart: checkinStart ? checkinStart.toISOString().split("T")[0] : null,
          checkinEnd: checkinEnd ? checkinEnd.toISOString().split("T")[0] : null,
          checkoutStart: checkoutStart ? checkoutStart.toISOString().split("T")[0] : null,
          checkoutEnd: checkoutEnd ? checkoutEnd.toISOString().split("T")[0] : null,
          sortBy,
          sortOrder,
        });
      } else {
        // REAL MODE: Use Supabase RPC
        const [sortBy, sortOrder] = sortValue.split("-");

        const { data, error } = await supabase.rpc("host_search_bookings", {
          host_id: user.id,
          search_query: debouncedSearch || null,
          status_filter: statusFilter !== "all" ? (statusFilter as any) : null,
          min_price: minPrice ? parseFloat(minPrice) : null,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
          checkin_start: checkinStart ? checkinStart.toISOString().split("T")[0] : null,
          checkin_end: checkinEnd ? checkinEnd.toISOString().split("T")[0] : null,
          checkout_start: checkoutStart ? checkoutStart.toISOString().split("T")[0] : null,
          checkout_end: checkoutEnd ? checkoutEnd.toISOString().split("T")[0] : null,
          sort_by: sortBy,
          sort_order: sortOrder,
        });

        if (error) throw error;

        return data as Booking[];
      }
    },
    enabled: !!user?.id,
  });

  const handleClearFilters = () => {
    setStatusFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setCheckinStart(undefined);
    setCheckinEnd(undefined);
    setCheckoutStart(undefined);
    setCheckoutEnd(undefined);
  };

  const handleApplyFilters = (filters: {
    statusFilter: string;
    minPrice: string;
    maxPrice: string;
    checkinStart: Date | undefined;
    checkinEnd: Date | undefined;
    checkoutStart: Date | undefined;
    checkoutEnd: Date | undefined;
  }) => {
    setStatusFilter(filters.statusFilter);
    setMinPrice(filters.minPrice);
    setMaxPrice(filters.maxPrice);
    setCheckinStart(filters.checkinStart);
    setCheckinEnd(filters.checkinEnd);
    setCheckoutStart(filters.checkoutStart);
    setCheckoutEnd(filters.checkoutEnd);
  };

  const handleCancelBooking = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const handleContactGuest = async (booking: Booking) => {
    try {
      if (isDemoMode) {
        // DEMO MODE: Create/find thread in localStorage
        
        // 1. Ensure guest profile exists in localStorage
        storeProfile(booking.guest_user_id, {
          id: booking.guest_user_id,
          full_name: booking.guest_name || 'Unknown Guest',
          email: booking.guest_email,
          avatar_url: booking.guest_avatar,
          phone: null,
          date_of_birth: null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        
        // 2. Get or create thread between host and guest
        const threadId = getOrCreateThread(
          booking.guest_user_id,  // other user
          booking.id,             // booking_id
          booking.listing_id      // listing_id
        );
        
        // 3. Navigate to inbox with thread selected
        navigate('/host/inbox', {
          state: { threadId }
        });
        
      } else {
        // REAL MODE: Use Supabase RPC to get or create thread
        const { data, error } = await supabase.rpc('get_or_create_thread', {
          p_participant_1_id: user!.id,
          p_participant_2_id: booking.guest_user_id,
          p_booking_id: booking.id,
          p_listing_id: booking.listing_id
        });

        if (error) throw error;
        
        navigate('/host/inbox', {
          state: { threadId: data }
        });
      }
    } catch (error) {
      console.error("Error creating thread:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactSupport = async (booking: Booking) => {
    try {
      if (isDemoMode) {
        // DEMO MODE: Check for existing dispute in localStorage
        const existingDispute = getDisputeForBooking(booking.id);
        
        if (existingDispute && existingDispute.support_thread_id) {
          navigate("/host/inbox", {
            state: { threadId: existingDispute.support_thread_id },
          });
        } else {
          setBookingForDispute(booking);
          setDisputeDialogOpen(true);
        }
      } else {
        // REAL MODE: Check Supabase for existing dispute
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        // Check if dispute already exists for this booking by this user
        const { data: existingDispute } = await supabase
          .from("disputes")
          .select("id, support_thread_id")
          .eq("booking_id", booking.id)
          .eq("initiated_by_user_id", currentUser.id)
          .in("status", ["open", "in_progress", "escalated"])
          .maybeSingle();

        if (existingDispute?.support_thread_id) {
          navigate("/host/inbox", {
            state: { threadId: existingDispute.support_thread_id },
          });
        } else {
          setBookingForDispute(booking);
          setDisputeDialogOpen(true);
        }
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

  const handleCancelConfirm = async () => {
    if (!bookingToCancel) return;

    try {
      if (isDemoMode) {
        // DEMO MODE: Update booking in localStorage
        const updates = {
          status: 'cancelled_host' as const,
          updated_at: new Date().toISOString(),
        };
        
        updateBooking(bookingToCancel.id, updates);
        
        // Invalidate cache to refresh the list
        queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
        
        toast({
          title: "Booking Cancelled",
          description: `Booking ${bookingToCancel.id} has been cancelled successfully.`,
        });
        
        setCancelDialogOpen(false);
        setBookingToCancel(null);
      } else {
        // REAL MODE: Use Supabase RPC
        const { data: result, error } = await supabase.rpc(
          'host_cancel_booking_full_refund',
          { p_booking_id: bookingToCancel.id }
        );

        if (error) throw error;

        const response = result as { success: boolean; error?: string; refund_amount?: number };

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to cancel booking');
        }

        // Optimistic UI update
        queryClient.setQueryData(
          [
            "host-bookings",
            user?.id,
            debouncedSearch,
            statusFilter,
            minPrice,
            maxPrice,
            checkinStart,
            checkinEnd,
            checkoutStart,
            checkoutEnd,
            sortValue,
            isDemoMode,
          ],
          (old: Booking[] | undefined) => 
            old?.map(b => 
              b.id === bookingToCancel.id 
                ? { ...b, status: 'cancelled_host' as const }
                : b
            ) ?? []
        );

        const refundAmount = response.refund_amount || 0;
        toast({
          title: "Booking Cancelled",
          description: `La réservation a été annulée. Le locataire recevra un remboursement de ${refundAmount.toFixed(2)} €.`,
        });

        setCancelDialogOpen(false);
        
        // Verify backend update with retry polling
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          const { data: updatedBooking } = await supabase
            .from('bookings')
            .select('status')
            .eq('id', bookingToCancel.id)
            .maybeSingle();
          
          if (updatedBooking?.status === 'cancelled_host' || attempts++ >= 3) {
            clearInterval(pollInterval);
            queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
          }
        }, 400);
      }
    } catch (error: any) {
      console.error('Cancellation error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to cancel booking. Please try again.",
      });
    }
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        {/* Controls Row */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par bien ou locataire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setManualBookingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle réservation
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
            <BookingsFiltersSheet
              statusFilter={statusFilter}
              minPrice={minPrice}
              maxPrice={maxPrice}
              checkinStart={checkinStart}
              checkinEnd={checkinEnd}
              checkoutStart={checkoutStart}
              checkoutEnd={checkoutEnd}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
            />
            <Select value={sortValue} onValueChange={setSortValue}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Date : Plus récent</SelectItem>
                <SelectItem value="created_at-asc">Date : Plus ancien</SelectItem>
                <SelectItem value="host_payout_gross-desc">Montant : Décroissant</SelectItem>
                <SelectItem value="host_payout_gross-asc">Montant : Croissant</SelectItem>
                <SelectItem value="checkin_date-desc">Arrivée : Plus récent</SelectItem>
                <SelectItem value="checkin_date-asc">Arrivée : Plus ancien</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <BookingsTable
          bookings={bookings}
          loading={isLoading}
          onCancelBooking={handleCancelBooking}
          onContactSupport={handleContactSupport}
          onContactGuest={handleContactGuest}
          onEditBooking={async (booking) => {
            const { data } = await supabase
              .from("bookings")
              .select("id, listing_id, checkin_date, checkout_date, nights, guests, total_price, cleaning_fee, notes, status, pricing_breakdown")
              .eq("id", booking.id)
              .maybeSingle();
            if (data) {
              setBookingToEdit({ ...data, listing_title: booking.listing_title });
              setEditBookingOpen(true);
            }
          }}
          onViewDetails={async (booking) => {
            const { data } = await supabase
              .from("bookings")
              .select("id, listing_id, checkin_date, checkout_date, nights, guests, total_price, cleaning_fee, notes, status, pricing_breakdown, access_token")
              .eq("id", booking.id)
              .maybeSingle();
            if (data) {
              setBookingDetail({
                ...data,
                listing_title: booking.listing_title,
                guest_name: booking.guest_name || "Locataire inconnu",
                guest_email: booking.guest_email,
                guest_phone: null,
              } as BookingDetailData);
              setDetailDialogOpen(true);
            }
          }}
        />
      </CardContent>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la réservation ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="text-foreground">
                Le locataire sera intégralement remboursé du montant total 
                ({bookingToCancel?.host_payout_gross.toFixed(2)} €). Cette action est irréversible.
              </p>
              <div className="pt-2 text-sm text-foreground">
                <p className="font-semibold">Détails :</p>
                <ul className="list-disc list-inside">
                  <li>Locataire : {bookingToCancel?.guest_name}</li>
                  <li>Dates : {bookingToCancel?.checkin_date} au {bookingToCancel?.checkout_date}</li>
                  <li>Bien : {bookingToCancel?.listing_title}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conserver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {disputeDialogOpen && bookingForDispute && (
        <CreateDisputeDialog
          open={disputeDialogOpen}
          onOpenChange={setDisputeDialogOpen}
          bookingId={bookingForDispute.id}
          listingTitle={bookingForDispute.listing_title}
        />
      )}

      <CreateManualBookingDialog
        open={manualBookingOpen}
        onOpenChange={setManualBookingOpen}
      />

      <EditManualBookingDialog
        open={editBookingOpen}
        onOpenChange={setEditBookingOpen}
        booking={bookingToEdit}
      />

      <ImportBookingsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      <BookingDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        booking={bookingDetail}
        onEdit={(b) => {
          setBookingToEdit({ ...b, listing_title: b.listing_title });
          setEditBookingOpen(true);
        }}
      />
    </Card>
  );
}

