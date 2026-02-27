import { format } from "date-fns";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface DashboardBookingCardProps {
  booking: {
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
  };
  onCancelBooking?: (booking: any) => void;
  onMessageHost?: (booking: any) => void;
  onContactSupport?: (booking: any) => void;
  showReviewButton?: boolean;
  hasReview?: boolean;
  onReviewAction?: () => void;
}

export const DashboardBookingCard = ({
  booking,
  onCancelBooking,
  onMessageHost,
  onContactSupport,
  showReviewButton = false,
  hasReview = false,
  onReviewAction,
}: DashboardBookingCardProps) => {
  const navigate = useNavigate();

  // Safety check: ensure listings data exists
  if (!booking.listings) {
    console.error("Booking missing listings data:", booking);
    return null;
  }

  const formatDateRange = () => {
    const checkin = format(new Date(booking.checkin_date), "MMM dd");
    const checkout = format(new Date(booking.checkout_date), "MMM dd, yyyy");
    return `${checkin} - ${checkout}`;
  };

  const formatAddress = () => {
    const parts = [
      booking.listings.address,
      booking.listings.city,
      booking.listings.state,
      booking.listings.country,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const formatPropertyDetails = () => {
    const parts = [booking.listings.type];
    if (booking.listings.size_sqft) {
      parts.push(`${booking.listings.size_sqft} sq ft`);
    }
    return parts.join(" • ");
  };

  return (
    <div className="flex items-center gap-3 p-4 border border-[#D5DAE7] rounded-lg hover:bg-[#F8FAFF] transition-colors">
      {/* Listing Image */}
      <img
        src={booking.listings.cover_image || "/placeholder.svg"}
        alt={booking.listings.title}
        className="w-20 h-20 rounded-lg object-cover shrink-0"
      />

      {/* Booking Details */}
      <div className="flex-1 min-w-0">
        {/* Line 1: Dates, Price, Guests */}
        <p className="text-sm text-muted-foreground mb-1">
          {formatDateRange()} • ${booking.total_price.toLocaleString()} for{" "}
          {booking.nights} {booking.nights === 1 ? "night" : "nights"} •{" "}
          {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
        </p>

        {/* Line 2: Listing Title */}
        <h4 className="text-base font-semibold text-foreground truncate mb-1">
          {booking.listings.title}
        </h4>

        {/* Line 3: Full Address */}
        <p className="text-sm text-muted-foreground truncate mb-1">
          {formatAddress()}
        </p>

        {/* Line 4: Property Type & Size */}
        <p className="text-xs text-muted-foreground">{formatPropertyDetails()}</p>
      </div>

      {/* Actions */}
      {showReviewButton ? (
        <Button
          variant={hasReview ? "outline" : "default"}
          onClick={onReviewAction}
          className="shrink-0"
        >
          {hasReview ? "View Review" : "Leave Review"}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/listing/${booking.listings.id}`)}>
              View Property
            </DropdownMenuItem>
            {booking.status === "confirmed" && onMessageHost && (
              <DropdownMenuItem onClick={() => onMessageHost(booking)}>
                Message Host
              </DropdownMenuItem>
            )}
            {onContactSupport && (
              <DropdownMenuItem onClick={() => onContactSupport(booking)}>
                Contact Support
              </DropdownMenuItem>
            )}
            {booking.status === "confirmed" && onCancelBooking && (
              <DropdownMenuItem onClick={() => onCancelBooking(booking)}>
                Cancel Booking
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
