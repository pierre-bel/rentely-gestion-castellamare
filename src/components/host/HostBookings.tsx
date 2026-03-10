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
import { Search, Download, Trash2 } from "lucide-react";
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
import * as XLSX from "xlsx";

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
  status: "confirmed" | "pending_payment" | "cancelled" | "completed" | "cancelled_guest" | "cancelled_host" | "expired" | "owner_blocked" | "pre_reservation";
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
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

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

  const handleExportExcel = async () => {
    if (!bookings || bookings.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucune réservation à exporter.", variant: "destructive" });
      return;
    }

    try {
      // Fetch full booking details for all bookings
      const bookingIds = bookings.map(b => b.id);
      const { data: fullBookings } = await supabase
        .from("bookings")
        .select("id, listing_id, checkin_date, checkout_date, subtotal, cleaning_fee, status, igloohome_code, notes, created_at, pricing_breakdown")
        .in("id", bookingIds);

      // Fetch listing titles
      const listingIds = [...new Set(bookings.map(b => b.listing_id))];
      const { data: listingsData } = await supabase
        .from("listings")
        .select("id, title")
        .in("id", listingIds);
      const listingMap = new Map((listingsData || []).map(l => [l.id, l.title]));

      // Fetch payment items for all bookings
      const { data: paymentItems } = await supabase
        .from("booking_payment_items")
        .select("booking_id, label, amount, is_paid")
        .in("booking_id", bookingIds)
        .order("sort_order");

      // Group payment items by booking
      const paymentMap = new Map<string, typeof paymentItems>();
      (paymentItems || []).forEach(pi => {
        const arr = paymentMap.get(pi.booking_id) || [];
        arr.push(pi);
        paymentMap.set(pi.booking_id, arr);
      });

      // Collect tenant IDs from pricing_breakdown
      const tenantIds: string[] = [];
      (fullBookings || []).forEach(b => {
        const pb = b.pricing_breakdown as any;
        if (pb?.tenant_id) tenantIds.push(pb.tenant_id);
      });

      // Fetch tenants
      const { data: tenantsData } = tenantIds.length > 0
        ? await supabase
            .from("tenants")
            .select("id, first_name, last_name, email, phone, gender, street, street_number, postal_code, city, country, notes")
            .in("id", tenantIds)
        : { data: [] };
      const tenantMap = new Map((tenantsData || []).map(t => [t.id, t]));

      const formatDateFR = (d: string) => {
        if (!d) return "";
        const [y, m, dd] = d.split("-");
        return `${dd}/${m}/${y}`;
      };

      const formatCreatedAt = (iso: string) => {
        if (!iso) return "";
        const d = new Date(iso);
        const yy = String(d.getFullYear()).slice(-2);
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${yy}-${mm}-${dd} ${hh}:${min}`;
      };

      const genderLabel = (g: string | null) => {
        if (!g) return "";
        return g === "male" ? "homme" : g === "female" ? "femme" : "";
      };

      const rows = (fullBookings || []).map(b => {
        const pb = b.pricing_breakdown as any;
        const tenant = pb?.tenant_id ? tenantMap.get(pb.tenant_id) : null;
        const items = paymentMap.get(b.id) || [];
        const deposit = items.find(i => i.label === "Acompte");
        const balance = items.find(i => i.label === "Solde");

        return {
          "Nom du bien": listingMap.get(b.listing_id) || "",
          "Date d'arrivée (JJ/MM/AAAA)": formatDateFR(b.checkin_date),
          "Date de départ (JJ/MM/AAAA)": formatDateFR(b.checkout_date),
          "Prix de location (€)": b.subtotal ?? 0,
          "Frais de ménage (€)": b.cleaning_fee ?? 0,
          "Statut": b.status || "",
          "Code clé Igloohome": b.igloohome_code || "",
          "Notes": b.notes || "",
          "Date de création (AA-MM-JJ HH:mm)": formatCreatedAt(b.created_at),
          "Prénom du locataire": tenant?.first_name || "",
          "Nom du locataire": tenant?.last_name || "",
          "E-mail du locataire": tenant?.email || "",
          "Téléphone du locataire": tenant?.phone || "",
          "Sexe (homme/femme)": genderLabel(tenant?.gender || null),
          "Rue": tenant?.street || "",
          "Numéro": tenant?.street_number || "",
          "Code postal": tenant?.postal_code || "",
          "Ville": tenant?.city || "",
          "Pays": tenant?.country || "",
          "Notes locataire": tenant?.notes || "",
          "Montant acompte (€)": deposit?.amount ?? "",
          "Acompte payé (oui/non)": deposit ? (deposit.is_paid ? "oui" : "non") : "",
          "Solde payé (oui/non)": balance ? (balance.is_paid ? "oui" : "non") : "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length, ...rows.map(r => String((r as any)[key] ?? "").length)) + 2,
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Réservations");

      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `reservations-${today}.xlsx`);

      toast({ title: "Export réussi", description: `${rows.length} réservation(s) exportée(s).` });
    } catch (err: any) {
      toast({ title: "Erreur d'export", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteAllBookings = async () => {
    if (!user?.id) return;
    setIsDeletingAll(true);
    try {
      // Get all booking IDs for this host's listings
      const { data: hostListings } = await supabase
        .from("listings")
        .select("id")
        .eq("host_user_id", user.id);

      if (!hostListings || hostListings.length === 0) {
        toast({ title: "Aucune réservation à supprimer" });
        return;
      }

      const listingIds = hostListings.map((l) => l.id);

      // Delete all bookings for these listings
      const { error } = await supabase
        .from("bookings")
        .delete()
        .in("listing_id", listingIds);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["host-calendar-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-bookings"] });
      toast({ title: "Toutes les réservations ont été supprimées" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsDeletingAll(false);
      setDeleteAllDialogOpen(false);
    }
  };


  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par bien ou locataire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => setManualBookingOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Nouvelle réservation</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Importer</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Exporter</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteAllDialogOpen(true)} disabled={bookings.length === 0}>
              <Trash2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Tout supprimer</span>
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
              <SelectTrigger className="w-[160px] sm:w-[200px]">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Plus récent</SelectItem>
                <SelectItem value="created_at-asc">Plus ancien</SelectItem>
                <SelectItem value="host_payout_gross-desc">Montant ↓</SelectItem>
                <SelectItem value="host_payout_gross-asc">Montant ↑</SelectItem>
                <SelectItem value="checkin_date-desc">Arrivée ↓</SelectItem>
                <SelectItem value="checkin_date-asc">Arrivée ↑</SelectItem>
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
          onEditBooking={(booking) => {
            (async () => {
              try {
                const { data, error } = await supabase
                  .from("bookings")
                  .select("id, listing_id, checkin_date, checkout_date, nights, guests, total_price, cleaning_fee, notes, status, pricing_breakdown, beach_cabin")
                  .eq("id", booking.id)
                  .maybeSingle();
                if (error) throw error;
                if (data) {
                  setBookingToEdit({ ...data, listing_title: booking.listing_title });
                  setEditBookingOpen(true);
                }
              } catch (err) {
                console.error("Error fetching booking for edit:", err);
                toast({ title: "Erreur", description: "Impossible de charger la réservation.", variant: "destructive" });
              }
            })();
          }}
          onViewDetails={(booking) => {
            (async () => {
              try {
                const { data, error } = await supabase
                  .from("bookings")
                   .select("id, listing_id, checkin_date, checkout_date, checkin_time, checkout_time, nights, guests, total_price, cleaning_fee, notes, status, pricing_breakdown, access_token, beach_cabin")
                  .eq("id", booking.id)
                  .maybeSingle();
                if (error) throw error;
                if (data) {
                  setBookingDetail({
                    ...data,
                    checkin_time: (data as any).checkin_time || null,
                    checkout_time: (data as any).checkout_time || null,
                    listing_title: booking.listing_title,
                    guest_name: booking.guest_name || "Locataire inconnu",
                    guest_email: booking.guest_email,
                    guest_phone: null,
                  } as BookingDetailData);
                  setDetailDialogOpen(true);
                }
              } catch (err) {
                console.error("Error fetching booking details:", err);
                toast({ title: "Erreur", description: "Impossible de charger les détails.", variant: "destructive" });
              }
            })();
          }}
          onDeleteBooking={async (booking) => {
            try {
              const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
              if (error) throw error;
              queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
              queryClient.invalidateQueries({ queryKey: ["host-calendar-bookings"] });
              toast({ title: "Supprimée", description: "La réservation a été supprimée." });
            } catch (err: any) {
              toast({ title: "Erreur", description: err.message, variant: "destructive" });
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
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer TOUTES les réservations ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="text-destructive font-semibold">
                ⚠️ Attention : cette action est irréversible !
              </p>
              <p>
                Vous êtes sur le point de supprimer définitivement toutes vos réservations 
                ({bookings.length} réservation{bookings.length > 1 ? "s" : ""}), 
                ainsi que leurs échéances de paiement et contrats associés.
              </p>
              <p>
                Cette action ne peut pas être annulée. Êtes-vous absolument sûr(e) ?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllBookings}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeletingAll}
            >
              {isDeletingAll ? "Suppression..." : "Oui, tout supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

