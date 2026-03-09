import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BookingDetailDialog, type BookingDetailData } from "./BookingDetailDialog";
import { EditManualBookingDialog } from "./EditManualBookingDialog";

interface UpcomingBooking {
  id: string;
  listing_id: string;
  listing_title: string;
  guest_name: string | null;
  guest_email: string;
  guest_avatar: string | null;
  checkin_date: string;
  checkout_date: string;
  guests: number;
  host_payout_gross: number;
  status: string;
}

interface DashboardUpcomingBookingsProps {
  userId: string;
}

const formatBookingDates = (checkin: string, checkout: string) => {
  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  return `${format(checkinDate, "d MMM", { locale: fr })} - ${format(checkoutDate, "d MMM yyyy", { locale: fr })}`;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price);

const getInitials = (name: string | null) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getDaysUntilLabel = (checkinDate: string) => {
  const days = differenceInDays(new Date(checkinDate), new Date());
  if (days < 0) return { label: "En cours", className: "bg-primary/10 text-primary border-primary/20" };
  if (days === 0) return { label: "Aujourd'hui", className: "bg-destructive/10 text-destructive border-destructive/20" };
  if (days === 1) return { label: "Demain", className: "bg-warning/10 text-warning border-warning/20" };
  if (days <= 7) return { label: `Dans ${days} jours`, className: "bg-warning/10 text-warning border-warning/20" };
  return { label: `Dans ${days} jours`, className: "bg-muted text-muted-foreground border-border" };
};

export default function DashboardUpcomingBookings({ userId }: DashboardUpcomingBookingsProps) {
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editBooking, setEditBooking] = useState<BookingDetailData | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["dashboard-upcoming-bookings", userId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.rpc("host_search_bookings", {
        host_id: userId,
        search_query: null,
        status_filter: null,
        min_price: null,
        max_price: null,
        checkin_start: null,
        checkin_end: null,
        checkout_start: today,
        checkout_end: null,
        sort_by: "checkin_date",
        sort_order: "asc",
      });
      if (error) throw error;
      const active = (data || []).filter((b: any) =>
        !["cancelled", "cancelled_guest", "cancelled_host", "completed", "expired"].includes(b.status)
      );
      return active.slice(0, 5) as UpcomingBooking[];
    },
  });

  const handleRowClick = async (booking: UpcomingBooking) => {
    setLoadingDetail(true);
    try {
      const { data: full, error } = await supabase
        .from("bookings")
        .select("*, listings(title)")
        .eq("id", booking.id)
        .single();
      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone")
        .eq("id", full.guest_user_id)
        .single();

      setSelectedBooking({
        id: full.id,
        listing_id: full.listing_id,
        listing_title: (full.listings as any)?.title || booking.listing_title,
        checkin_date: full.checkin_date,
        checkout_date: full.checkout_date,
        checkin_time: (full as any).checkin_time || null,
        checkout_time: (full as any).checkout_time || null,
        nights: full.nights,
        guests: full.guests,
        total_price: full.total_price,
        cleaning_fee: full.cleaning_fee,
        notes: full.notes,
        status: full.status || "pending_payment",
        pricing_breakdown: full.pricing_breakdown,
        guest_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email : booking.guest_email,
        guest_email: profile?.email || booking.guest_email,
        guest_phone: profile?.phone || null,
        access_token: full.access_token,
      });
      setDetailOpen(true);
    } catch (e) {
      console.error("Failed to load booking details", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Aucune location à venir</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {bookings.map((booking) => {
          const daysInfo = getDaysUntilLabel(booking.checkin_date);
          return (
            <div
              key={booking.id}
              className="p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleRowClick(booking)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={booking.guest_avatar || ""} />
                    <AvatarFallback>{getInitials(booking.guest_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate text-sm">
                    {booking.guest_name || booking.guest_email}
                  </span>
                </div>
                <Badge variant="outline" className={`shrink-0 text-xs ${daysInfo.className}`}>
                  {daysInfo.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{booking.listing_title}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {formatBookingDates(booking.checkin_date, booking.checkout_date)}
                </span>
                <span className="text-sm font-semibold">{formatPrice(booking.host_payout_gross)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Locataire</TableHead>
              <TableHead className="font-semibold">Bien</TableHead>
              <TableHead className="font-semibold">Dates</TableHead>
              <TableHead className="font-semibold">Arrivée</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking, index) => {
              const daysInfo = getDaysUntilLabel(booking.checkin_date);
              return (
                <TableRow
                  key={booking.id}
                  className={`cursor-pointer ${index % 2 === 0 ? "bg-muted/30 hover:bg-muted/50" : "hover:bg-muted/50"}`}
                  onClick={() => handleRowClick(booking)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={booking.guest_avatar || ""} alt={booking.guest_name || "Locataire"} />
                        <AvatarFallback>{getInitials(booking.guest_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate max-w-[120px]">
                        {booking.guest_name || booking.guest_email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="truncate max-w-[150px]">
                    {booking.listing_title}
                  </TableCell>
                  <TableCell>
                    {formatBookingDates(booking.checkin_date, booking.checkout_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={daysInfo.className}>
                      {daysInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.status as any} />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatPrice(booking.host_payout_gross)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <BookingDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        booking={selectedBooking}
        onEdit={(b) => {
          setEditBooking(b);
          setEditOpen(true);
        }}
      />

      <EditManualBookingDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        booking={editBooking}
      />
    </>
  );
}
