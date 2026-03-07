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

interface UpcomingBooking {
  id: string;
  listing_title: string;
  guest_name: string | null;
  guest_email: string;
  guest_avatar: string | null;
  checkin_date: string;
  checkout_date: string;
  host_payout_gross: number;
  status: "confirmed" | "pending_payment" | "cancelled" | "completed" | "cancelled_guest" | "cancelled_host" | "expired";
}

interface DashboardUpcomingBookingsProps {
  userId: string;
}

const formatBookingDates = (checkin: string, checkout: string) => {
  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  return `${format(checkinDate, "d MMM", { locale: fr })} - ${format(checkoutDate, "d MMM yyyy", { locale: fr })}`;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
};

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
      // Filter to only confirmed/pending, exclude cancelled/completed
      const active = (data || []).filter((b: any) =>
        !["cancelled", "cancelled_guest", "cancelled_host", "completed", "expired"].includes(b.status)
      );
      return active.slice(0, 5) as UpcomingBooking[];
    },
  });

  if (isLoading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
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
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    <div className="border border-border rounded-lg overflow-hidden">
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
                className={index % 2 === 0 ? "bg-muted/30 hover:bg-muted/50" : "hover:bg-muted/50"}
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
                  <StatusBadge status={booking.status} />
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
  );
}
