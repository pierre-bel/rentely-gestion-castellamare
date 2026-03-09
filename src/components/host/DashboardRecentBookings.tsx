import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ClipboardList } from "lucide-react";
import { BookingDetailDialog, type BookingDetailData } from "./BookingDetailDialog";
import { EditManualBookingDialog } from "./EditManualBookingDialog";

interface DashboardBooking {
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

interface DashboardRecentBookingsProps {
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

export default function DashboardRecentBookings({ userId }: DashboardRecentBookingsProps) {
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<BookingDetailData | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["dashboard-recent-bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("host_search_bookings", {
        host_id: userId,
        search_query: null,
        status_filter: null,
        min_price: null,
        max_price: null,
        checkin_start: null,
        checkin_end: null,
        checkout_start: null,
        checkout_end: null,
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (error) throw error;
      return (data?.slice(0, 5) || []) as DashboardBooking[];
    },
  });

  const handleRowClick = async (booking: DashboardBooking) => {
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
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Aucune réservation</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleRowClick(booking)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={booking.guest_avatar || ""} />
                  <AvatarFallback className="text-xs">{getInitials(booking.guest_name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium truncate text-sm">
                  {booking.guest_name || booking.guest_email}
                </span>
              </div>
              <StatusBadge status={booking.status as any} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatBookingDates(booking.checkin_date, booking.checkout_date)}
              </span>
              <span className="text-sm font-semibold">{formatPrice(booking.host_payout_gross)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Locataire</TableHead>
              <TableHead className="font-semibold">Dates</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking, index) => (
              <TableRow
                key={booking.id}
                className={`cursor-pointer ${index % 2 === 0 ? "bg-muted/30 hover:bg-muted/50" : "hover:bg-muted/50"}`}
                onClick={() => handleRowClick(booking)}
              >
                <TableCell className="font-mono text-sm">
                  {booking.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={booking.guest_avatar || ""} alt={booking.guest_name || "Locataire"} />
                      <AvatarFallback>{getInitials(booking.guest_name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate max-w-[150px]">
                      {booking.guest_name || booking.guest_email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {formatBookingDates(booking.checkin_date, booking.checkout_date)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={booking.status as any} />
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatPrice(booking.host_payout_gross)}
                </TableCell>
              </TableRow>
            ))}
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
