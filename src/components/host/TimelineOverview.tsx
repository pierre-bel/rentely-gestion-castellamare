import { useMemo, useRef } from "react";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  parseISO,
  isToday,
  isSameDay,
  isWeekend,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface BookingWithGuest {
  id: string;
  checkin_date: string;
  checkout_date: string;
  status: string;
  guests: number;
  notes: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  listing_id: string;
  listing_title: string;
}

interface ListingInfo {
  id: string;
  title: string;
  city: string | null;
  status: string | null;
}

interface TimelineOverviewProps {
  listings: ListingInfo[];
  bookings: BookingWithGuest[];
  blockedDates: { id: string; listing_id: string; start_date: string; end_date: string; price: number | null }[];
  currentMonth: Date;
  onBookingClick?: (booking: BookingWithGuest) => void;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-primary",
  pending_payment: "bg-[hsl(var(--warning))]",
  checked_in: "bg-[hsl(var(--info))]",
  completed: "bg-muted-foreground/60",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmée",
  pending_payment: "En attente",
  completed: "Terminée",
  checked_in: "En cours",
};

export default function TimelineOverview({ listings, bookings, blockedDates, currentMonth, onBookingClick }: TimelineOverviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);

  const CELL_W = isMobile ? 28 : 38;
  const LABEL_W = isMobile ? 110 : 170;

  const getBookingsForListing = (listingId: string) => {
    if (!bookings) return [];
    return bookings.filter((b) => b.listing_id === listingId);
  };

  const getBlockedForListing = (listingId: string) => {
    if (!blockedDates) return [];
    return blockedDates.filter((bd) => bd.listing_id === listingId);
  };

  // Calculate bar position & width for a booking within the visible month
  // Half-cell offset: checkin starts at mid-cell, checkout ends at mid-cell
  const getBarStyle = (checkin: Date, checkout: Date) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const visibleStart = checkin < monthStart ? monthStart : checkin;
    const visibleEnd = checkout > monthEnd ? monthEnd : checkout;

    const startIdx = Math.max(0, Math.round((visibleStart.getTime() - monthStart.getTime()) / 86400000));
    const endIdx = Math.min(days.length - 1, Math.round((visibleEnd.getTime() - monthStart.getTime()) / 86400000));

    // Apply half-cell offsets for actual check-in/checkout days (not clipped to month boundary)
    const halfCell = CELL_W / 2;
    const startsInMonth = checkin >= monthStart;
    const endsInMonth = checkout <= monthEnd;

    const left = startIdx * CELL_W + (startsInMonth ? halfCell : 0);
    const right = (endIdx + 1) * CELL_W - (endsInMonth ? halfCell : 0);
    const width = right - left - 2; // 2px gap

    return { left, width };
  };

  const truncateName = (name: string, maxLen?: number) => {
    const limit = maxLen ?? (isMobile ? 8 : 12);
    if (name.length <= limit) return name;
    return name.slice(0, limit) + "…";
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          {/* Listing labels column (fixed) */}
          <div className="flex-shrink-0 border-r border-border bg-card z-10" style={{ width: LABEL_W }}>
            {/* Header spacer */}
            <div className="h-10 border-b border-border flex items-center px-3">
              <span className="text-xs font-semibold text-muted-foreground">Biens</span>
            </div>
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="h-14 border-b border-border flex flex-col justify-center px-3"
              >
                <span className="text-sm font-medium truncate" title={listing.title}>
                  {listing.title}
                </span>
                {listing.city && (
                  <span className="text-[10px] text-muted-foreground truncate">{listing.city}</span>
                )}
              </div>
            ))}
          </div>

          {/* Scrollable timeline */}
          <div className="overflow-x-auto flex-1" ref={scrollRef}>
            <div style={{ minWidth: days.length * CELL_W }}>
              {/* Day headers */}
              <div className="flex h-10 border-b border-border">
                {days.map((day) => {
                  const today = isToday(day);
                  const weekend = isWeekend(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "flex flex-col items-center justify-center text-[10px] border-r border-border/50 flex-shrink-0",
                        today && "bg-primary/10 font-bold",
                        weekend && !today && "bg-muted/50",
                      )}
                      style={{ width: CELL_W }}
                    >
                      <span className="uppercase text-muted-foreground leading-none">
                        {format(day, "EEE", { locale: fr }).slice(0, 2)}
                      </span>
                      <span className={cn("leading-none mt-0.5", today && "text-primary font-bold")}>
                        {format(day, "d")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rows per listing */}
              {listings.map((listing) => {
                const listingBookings = getBookingsForListing(listing.id);
                const listingBlocked = getBlockedForListing(listing.id);

                return (
                  <div key={listing.id} className="relative h-14 border-b border-border">
                    {/* Background grid lines */}
                    <div className="absolute inset-0 flex">
                      {days.map((day) => {
                        const today = isToday(day);
                        const weekend = isWeekend(day);
                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "border-r border-border/30 flex-shrink-0 h-full",
                              today && "bg-primary/5",
                              weekend && !today && "bg-muted/30",
                            )}
                            style={{ width: CELL_W }}
                          />
                        );
                      })}
                    </div>

                    {/* Blocked date bars */}
                    {listingBlocked.map((bd) => {
                      const s = parseISO(bd.start_date);
                      const e = parseISO(bd.end_date);
                      const { left, width } = getBarStyle(s, e);
                      if (width <= 0) return null;
                      return (
                        <div
                          key={bd.id}
                          className="absolute top-1 bottom-1 rounded bg-[hsl(var(--calendar-blocked)/0.15)] border border-[hsl(var(--calendar-blocked)/0.3)]"
                          style={{ left: left + 2, width }}
                        />
                      );
                    })}

                    {/* Booking bars */}
                    {listingBookings.map((booking) => {
                      const checkin = parseISO(booking.checkin_date);
                      const checkout = parseISO(booking.checkout_date);
                      const { left, width } = getBarStyle(checkin, checkout);
                      if (width <= 0) return null;

                      const colorClass = STATUS_COLORS[booking.status] || "bg-primary";
                      const displayName = truncateName(booking.guest_name);

                      return (
                        <Tooltip key={booking.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-2 bottom-2 rounded-md flex items-center px-1.5 cursor-pointer overflow-hidden transition-opacity hover:opacity-90",
                                colorClass,
                                "text-primary-foreground shadow-sm",
                              )}
                              style={{ left: left + 2, width }}
                              onClick={() => onBookingClick?.(booking)}
                            >
                              <span className="text-[11px] font-medium truncate leading-none whitespace-nowrap">
                                {displayName}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[220px]">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm">{booking.guest_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(checkin, "d MMM", { locale: fr })} → {format(checkout, "d MMM", { locale: fr })}
                              </p>
                              
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                                {STATUS_LABELS[booking.status] || booking.status}
                              </span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
