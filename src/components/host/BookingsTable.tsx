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

interface BookingsTableProps {
  bookings: Booking[];
  loading: boolean;
  onCancelBooking: (booking: Booking) => void;
  onContactSupport: (booking: Booking) => void;
  onContactGuest: (booking: Booking) => void;
}


const formatBookingDates = (checkin: string, checkout: string) => {
  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  return `${format(checkinDate, "MMM d")} - ${format(checkoutDate, "MMM d, yyyy")}`;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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

export const BookingsTable = ({ bookings, loading, onCancelBooking, onContactSupport, onContactGuest }: BookingsTableProps) => {
  if (loading) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Booking ID</TableHead>
              <TableHead className="font-semibold">Listing Name</TableHead>
              <TableHead className="font-semibold">Guest Name</TableHead>
              <TableHead className="font-semibold">Booking Dates</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className={i % 2 === 0 ? "bg-[#F8FAFF]" : ""}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground text-lg">No bookings found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="font-semibold">Booking ID</TableHead>
            <TableHead className="font-semibold">Listing Name</TableHead>
            <TableHead className="font-semibold">Guest Name</TableHead>
            <TableHead className="font-semibold">Booking Dates</TableHead>
            <TableHead className="font-semibold">Amount</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking, index) => (
            <TableRow
              key={booking.id}
              className={index % 2 === 0 ? "bg-[#F8FAFF] hover:bg-muted/50" : "hover:bg-muted/50"}
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
                    <AvatarImage src={booking.guest_avatar || ""} alt={booking.guest_name || "Guest"} />
                    <AvatarFallback>{getInitials(booking.guest_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{booking.guest_name || "Unknown Guest"}</span>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {booking.status === 'confirmed' && (
                      <DropdownMenuItem 
                        onClick={() => onCancelBooking(booking)}
                        className="text-destructive focus:text-destructive"
                      >
                        Cancel Booking
                      </DropdownMenuItem>
                    )}
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onContactGuest(booking)}>
                        Contact Guest
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onContactSupport(booking)}>
                        Contact Support
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
