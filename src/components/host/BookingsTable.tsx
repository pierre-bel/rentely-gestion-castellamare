import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface BookingsTableProps {
  bookings: Booking[];
  loading: boolean;
  onCancelBooking: (booking: Booking) => void;
  onContactSupport: (booking: Booking) => void;
  onContactGuest: (booking: Booking) => void;
  onEditBooking?: (booking: Booking) => void;
  onViewDetails?: (booking: Booking) => void;
  onDeleteBooking?: (booking: Booking) => void;
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

const headers = ["ID", "Bien", "Locataire", "Dates", "Montant", "Statut", "Action"];

const BookingActions = ({ booking, onCancelBooking, onContactSupport, onContactGuest, onEditBooking, onViewDetails, onDeleteBooking }: {
  booking: Booking;
  onCancelBooking: (b: Booking) => void;
  onContactSupport: (b: Booking) => void;
  onContactGuest: (b: Booking) => void;
  onEditBooking?: (b: Booking) => void;
  onViewDetails?: (b: Booking) => void;
  onDeleteBooking?: (b: Booking) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {(booking.status === 'confirmed' || booking.status === 'pending_payment') && onEditBooking && (
        <DropdownMenuItem onClick={() => onEditBooking(booking)}>
          Modifier la réservation
        </DropdownMenuItem>
      )}
      {booking.status === 'confirmed' && (
        <DropdownMenuItem
          onClick={() => onCancelBooking(booking)}
          className="text-destructive focus:text-destructive"
        >
          Annuler la réservation
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => onViewDetails?.(booking)}>Voir les détails</DropdownMenuItem>
      {booking.status !== 'owner_blocked' && booking.status !== 'pre_reservation' && (
        <>
          <DropdownMenuItem onClick={() => onContactGuest(booking)}>
            Contacter le locataire
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onContactSupport(booking)}>
            Contacter le support
          </DropdownMenuItem>
        </>
      )}
      {onDeleteBooking && (
        <DropdownMenuItem
          onClick={() => onDeleteBooking(booking)}
          className="text-destructive focus:text-destructive"
        >
          Supprimer
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

export const BookingsTable = ({ bookings, loading, onCancelBooking, onContactSupport, onContactGuest, onEditBooking, onViewDetails, onDeleteBooking }: BookingsTableProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground text-lg">Aucune réservation trouvée</p>
        <p className="text-muted-foreground text-sm mt-2">
          Essayez de modifier vos filtres ou critères de recherche
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {bookings.map((booking) => (
          <div key={booking.id} className="p-3 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={booking.guest_avatar || ""} />
                  <AvatarFallback>{getInitials(booking.guest_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{booking.guest_name || "Locataire inconnu"}</p>
                  <p className="text-xs text-muted-foreground truncate">{booking.listing_title}</p>
                </div>
              </div>
              <BookingActions
                booking={booking}
                onCancelBooking={onCancelBooking}
                onContactSupport={onContactSupport}
                onContactGuest={onContactGuest}
                onEditBooking={onEditBooking}
                onViewDetails={onViewDetails}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatBookingDates(booking.checkin_date, booking.checkout_date)}
              </span>
              <StatusBadge status={booking.status} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-muted-foreground font-mono">{booking.id.slice(0, 8)}</span>
              <span className="text-sm font-semibold">{formatPrice(booking.host_payout_gross)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              {headers.map((h, i) => (
                <TableHead key={h} className={`font-semibold ${i === headers.length - 1 ? "text-right" : ""}`}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking, index) => (
              <TableRow
                key={booking.id}
                className={index % 2 === 0 ? "bg-muted/30 hover:bg-muted/50" : "hover:bg-muted/50"}
              >
                <TableCell className="font-mono text-sm">
                  {booking.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-medium">
                  {booking.listing_title}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={booking.guest_avatar || ""} alt={booking.guest_name || "Locataire"} />
                      <AvatarFallback>{getInitials(booking.guest_name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{booking.guest_name || "Locataire inconnu"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {formatBookingDates(booking.checkin_date, booking.checkout_date)}
                </TableCell>
                <TableCell className="font-semibold">
                  {formatPrice(booking.host_payout_gross)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={booking.status} />
                </TableCell>
                <TableCell className="text-right">
                  <BookingActions
                    booking={booking}
                    onCancelBooking={onCancelBooking}
                    onContactSupport={onContactSupport}
                    onContactGuest={onContactGuest}
                    onEditBooking={onEditBooking}
                    onViewDetails={onViewDetails}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
