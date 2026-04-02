import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, LayoutGrid, GanttChart, Share2, Code2, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import AvailabilityCalendar from "@/components/host/AvailabilityCalendar";
import TimelineOverview from "@/components/host/TimelineOverview";
import { BookingDetailDialog, type BookingDetailData } from "@/components/host/BookingDetailDialog";
import { EditManualBookingDialog } from "@/components/host/EditManualBookingDialog";

type ViewMode = "grid" | "timeline";

function ShareEmbedButton({ userId }: { userId?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  if (!userId) return null;

  const embedUrl = `${window.location.origin}/embed/availability/all/${userId}`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="800" frameborder="0" style="border:0; border-radius:12px;"></iframe>`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast({ title: "Copié !" });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <Share2 className="h-3.5 w-3.5" />
          Partager
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Lien public</p>
            <p className="text-xs text-muted-foreground mb-2">
              Vue de tous vos appartements, sans informations personnelles.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={() => copy(embedUrl, "link")}
            >
              {copied === "link" ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied === "link" ? "Copié" : "Copier le lien"}
            </Button>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Code d'intégration (iframe)</p>
            <pre className="text-[10px] bg-muted p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
              {iframeCode}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs mt-2"
              onClick={() => copy(iframeCode, "iframe")}
            >
              {copied === "iframe" ? <Check className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
              {copied === "iframe" ? "Copié" : "Copier le code iframe"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Availability() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [detailBooking, setDetailBooking] = useState<BookingDetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["host-listings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, city, status")
        .eq("host_user_id", user.id)
        .order("title");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["host-calendar-bookings", user?.id, format(currentMonth, "yyyy-MM"), listings],
    queryFn: async () => {
      if (!user || !listings || listings.length === 0) return [];
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 1)), "yyyy-MM-dd");
      const listingIds = listings.map((l) => l.id);

      const { data, error } = await supabase
        .from("bookings")
        .select("id, checkin_date, checkout_date, status, guests, notes, listing_id, guest_user_id, total_price, cleaning_fee, pricing_breakdown, nights")
        .in("listing_id", listingIds)
        .gte("checkout_date", rangeStart)
        .lte("checkin_date", rangeEnd)
        .not("status", "in", "(cancelled_guest,cancelled_host,expired)");

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const listingMap = new Map(listings.map((l) => [l.id, l.title]));
      const guestIds = [...new Set(data.map((b: any) => b.guest_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .in("id", guestIds);

      // Also fetch tenant names for bookings with tenant_id in pricing_breakdown
      const tenantIds = data
        .map((b: any) => b.pricing_breakdown?.tenant_id)
        .filter(Boolean) as string[];
      
      let tenantMap = new Map<string, any>();
      if (tenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from("tenants")
          .select("id, first_name, last_name, email, phone")
          .in("id", [...new Set(tenantIds)]);
        tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]));
      }

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return data.map((b: any) => {
        const profile = profileMap.get(b.guest_user_id);
        const tenantId = b.pricing_breakdown?.tenant_id;
        const tenant = tenantId ? tenantMap.get(tenantId) : null;

        // Priority: tenant from pricing_breakdown > tenant from notes > profile
        let guestName = "Locataire";
        let guestEmail = profile?.email || "";
        let guestPhone = profile?.phone || null;

        if (tenant) {
          guestName = `${tenant.first_name} ${tenant.last_name || ""}`.trim();
          guestEmail = tenant.email || guestEmail;
          guestPhone = tenant.phone || guestPhone;
        } else if (b.notes) {
          const tenantMatch = b.notes.match(/Locataire:\s*([^|]+)/);
          if (tenantMatch) {
            guestName = tenantMatch[1].trim();
          } else if (profile) {
            guestName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Locataire";
          }
        } else if (profile) {
          guestName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Locataire";
        }

        return {
          id: b.id,
          checkin_date: b.checkin_date,
          checkout_date: b.checkout_date,
          status: b.status,
          guests: b.guests,
          nights: b.nights,
          notes: b.notes,
          listing_id: b.listing_id,
          listing_title: listingMap.get(b.listing_id) || "—",
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          total_price: b.total_price,
          cleaning_fee: b.cleaning_fee,
          pricing_breakdown: b.pricing_breakdown,
        };
      });
    },
    enabled: !!user,
  });

  const { data: blockedDates } = useQuery({
    queryKey: ["host-blocked-dates", user?.id, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!user) return [];
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 1)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("listing_availability")
        .select("id, listing_id, start_date, end_date, price")
        .gte("end_date", rangeStart)
        .lte("start_date", rangeEnd);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    if (selectedListing) return listings.filter((l) => l.id === selectedListing);
    return listings;
  }, [listings, selectedListing]);

  const handleBookingClick = (booking: any) => {
    setDetailBooking(booking as BookingDetailData);
    setDetailOpen(true);
  };

  const handleEditFromDetail = (booking: BookingDetailData) => {
    setEditBooking({
      id: booking.id,
      listing_id: booking.listing_id,
      listing_title: booking.listing_title,
      checkin_date: booking.checkin_date,
      checkout_date: booking.checkout_date,
      nights: booking.nights,
      guests: booking.guests,
      total_price: booking.total_price,
      cleaning_fee: booking.cleaning_fee,
      notes: booking.notes,
      status: booking.status,
      pricing_breakdown: booking.pricing_breakdown,
    });
    setEditOpen(true);
  };

  const isLoading = listingsLoading || bookingsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 pb-8 lg:px-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-8 lg:px-8 space-y-6">
      {/* Controls bar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Month navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base sm:text-lg font-semibold capitalize min-w-[120px] sm:min-w-[160px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </h2>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs hidden sm:inline-flex">
              Aujourd'hui
            </Button>
          </div>

          {/* View toggle + share */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1 text-xs px-2 sm:px-3"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grille</span>
              </Button>
              <Button
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1 text-xs px-2 sm:px-3"
                onClick={() => setViewMode("timeline")}
              >
                <GanttChart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Vue d'ensemble</span>
              </Button>
            </div>
            <ShareEmbedButton userId={user?.id} />
          </div>
        </div>

        {/* Row 2: Listing filter badges (horizontal scroll on mobile) */}
        {listings && listings.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            <Badge
              variant={selectedListing === null ? "default" : "outline"}
              className="cursor-pointer text-xs whitespace-nowrap flex-shrink-0"
              onClick={() => setSelectedListing(null)}
            >
              Tous ({listings.length})
            </Badge>
            {listings.map((l) => (
              <Badge
                key={l.id}
                variant={selectedListing === l.id ? "default" : "outline"}
                className="cursor-pointer text-xs whitespace-nowrap flex-shrink-0"
                onClick={() => setSelectedListing(selectedListing === l.id ? null : l.id)}
              >
                {l.title}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Views */}
      {viewMode === "timeline" ? (
        <TimelineOverview
          listings={filteredListings}
          bookings={bookings || []}
          blockedDates={blockedDates || []}
          currentMonth={currentMonth}
          onBookingClick={handleBookingClick}
        />
      ) : (
        <AvailabilityCalendar
          listings={filteredListings}
          bookings={bookings || []}
          blockedDates={blockedDates || []}
          currentMonth={currentMonth}
          onBookingClick={handleBookingClick}
        />
      )}

      {/* Booking detail dialog */}
      <BookingDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        booking={detailBooking}
        onEdit={handleEditFromDetail}
      />

      {/* Edit dialog */}
      <EditManualBookingDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        booking={editBooking}
      />
    </div>
  );
}
