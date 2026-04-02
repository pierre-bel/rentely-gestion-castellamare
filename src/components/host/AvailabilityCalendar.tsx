import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  parseISO,
  isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface AvailabilityCalendarProps {
  listings: ListingInfo[];
  bookings: BookingWithGuest[];
  blockedDates: { id: string; listing_id: string; start_date: string; end_date: string; price: number | null }[];
  currentMonth: Date;
  onBookingClick?: (booking: BookingWithGuest) => void;
}

type DayStatus = "available" | "booked" | "pending" | "blocked" | "checkin-only" | "checkout-only" | "turnaround";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmée",
  pending_payment: "En attente",
  completed: "Terminée",
  cancelled: "Annulée",
  checked_in: "En cours",
  owner_blocked: "Bloqué",
  pre_reservation: "En attente",
};

export default function AvailabilityCalendar({ listings, bookings, blockedDates, currentMonth, onBookingClick }: AvailabilityCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getBookingsForDay = (day: Date, listingId: string): BookingWithGuest[] => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      if (b.listing_id !== listingId) return false;
      const checkin = parseISO(b.checkin_date);
      const checkout = parseISO(b.checkout_date);
      return day >= checkin && day <= checkout;
    });
  };

  const getDayStatus = (day: Date, listingId: string): { status: DayStatus; bookings: BookingWithGuest[] } => {
    const dayBookings = getBookingsForDay(day, listingId);

    if (dayBookings.length === 0) {
      const blocked = blockedDates?.some((bd) => {
        if (bd.listing_id !== listingId) return false;
        const s = parseISO(bd.start_date);
        const e = parseISO(bd.end_date);
        return day >= s && day <= e;
      });
      return { status: blocked ? "blocked" : "available", bookings: [] };
    }

    // Check for owner_blocked or pre_reservation status → treat as blocked or pending
    const ownerBlocked = dayBookings.find((b) => b.status === "owner_blocked");
    if (ownerBlocked) {
      return { status: "blocked", bookings: dayBookings };
    }
    const preRes = dayBookings.find((b) => b.status === "pre_reservation");
    if (preRes) {
      return { status: "pending", bookings: dayBookings };
    }

    const isCheckinFor = dayBookings.filter((b) => isSameDay(day, parseISO(b.checkin_date)));
    const isCheckoutFor = dayBookings.filter((b) => isSameDay(day, parseISO(b.checkout_date)));
    const isMidStay = dayBookings.filter((b) => {
      const ci = parseISO(b.checkin_date);
      const co = parseISO(b.checkout_date);
      return day > ci && day < co;
    });

    if (isMidStay.length > 0) {
      const isPending = isMidStay.some((b) => b.status === "pending_payment");
      return { status: isPending ? "pending" : "booked", bookings: dayBookings };
    }

    if (isCheckinFor.length > 0 && isCheckoutFor.length > 0) {
      return { status: "turnaround", bookings: dayBookings };
    }

    if (isCheckinFor.length > 0 && isCheckoutFor.length === 0) {
      const b = isCheckinFor[0];
      if (!isSameDay(parseISO(b.checkin_date), parseISO(b.checkout_date))) {
        return { status: "checkin-only", bookings: dayBookings };
      }
      return { status: "booked", bookings: dayBookings };
    }

    if (isCheckoutFor.length > 0 && isCheckinFor.length === 0) {
      return { status: "checkout-only", bookings: dayBookings };
    }

    return { status: "booked", bookings: dayBookings };
  };

  const getDayClasses = (status: DayStatus, inMonth: boolean, today: boolean): string => {
    const base = "relative flex flex-col items-center justify-start h-10 sm:h-14 md:h-16 rounded-lg text-xs sm:text-sm transition-all select-none mx-auto w-full p-0.5 sm:p-1 overflow-hidden";

    if (!inMonth) return cn(base, "opacity-20 text-muted-foreground");

    switch (status) {
      case "available":
        return cn(base, "bg-[hsl(var(--calendar-available)/0.25)] text-foreground hover:bg-[hsl(var(--calendar-available)/0.4)]", today && "ring-2 ring-primary font-bold");
      case "booked":
        return cn(base, "bg-primary text-primary-foreground font-semibold");
      case "pending":
        return cn(base, "bg-[hsl(var(--warning)/0.8)] text-white font-semibold");
      case "blocked":
        return cn(base, "bg-[hsl(var(--calendar-blocked)/0.25)] text-[hsl(var(--calendar-blocked))] line-through");
      case "checkin-only":
      case "checkout-only":
      case "turnaround":
        return cn(base, "font-medium", today && "ring-2 ring-primary");
      default:
        return base;
    }
  };

  const weekDays = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  if (listings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Aucun bien trouvé. Créez votre premier bien pour commencer.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {listings.map((listing) => (
        <Card key={listing.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{listing.title}</CardTitle>
              <Badge variant={listing.status === "approved" ? "default" : "secondary"} className="text-xs">
                {listing.status === "approved" ? "Actif" : listing.status}
              </Badge>
            </div>
            {listing.city && <p className="text-xs text-muted-foreground">{listing.city}</p>}
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-[0.7rem] font-medium text-muted-foreground uppercase py-1.5">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const { status, bookings: dayBookings } = getDayStatus(day, listing.id);
                const booking = dayBookings[0];
                const isBlocked = booking?.status === "owner_blocked";
                const blockReason = isBlocked ? (booking?.notes?.split(" | ")[0] || "Bloqué") : "";
                const guestFirstName = isBlocked ? blockReason : (booking?.guest_name?.split(" ")[0] || "");
                const guestFullName = isBlocked ? blockReason : (booking?.guest_name || "");

                const renderNameLabel = (textColor: string = "text-primary-foreground") => {
                  if (!booking || status === "available" || status === "blocked") return null;
                  return (
                    <span className={cn(
                      "block w-full text-center leading-tight truncate",
                      "text-[7px] sm:text-[9px] md:text-[10px]",
                      textColor
                    )}>
                      <span className="hidden md:inline">{guestFullName}</span>
                      <span className="md:hidden">{guestFirstName}</span>
                    </span>
                  );
                };

                return (
                  <Tooltip key={day.toISOString()}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center">
                        {(status === "checkin-only" || status === "checkout-only" || status === "turnaround") ? (
                          <div className={cn(
                            "relative flex flex-col items-center justify-start h-10 sm:h-14 md:h-16 rounded-lg text-xs sm:text-sm font-medium cursor-default select-none mx-auto overflow-hidden w-full p-0.5 sm:p-1",
                            !inMonth && "opacity-20",
                            today && "ring-2 ring-primary",
                          )}>
                            {(status === "checkout-only" || status === "turnaround") && (
                              <div className="absolute inset-0 w-1/2 bg-primary/70 rounded-l-lg" />
                            )}
                            {(status === "checkin-only" || status === "turnaround") && (
                              <div className="absolute right-0 inset-y-0 w-1/2 bg-primary/70 rounded-r-lg" />
                            )}
                            {status === "checkin-only" && (
                              <div className="absolute inset-0 w-1/2 bg-[hsl(var(--calendar-available)/0.25)] rounded-l-lg" />
                            )}
                            {status === "checkout-only" && (
                              <div className="absolute right-0 inset-y-0 w-1/2 bg-[hsl(var(--calendar-available)/0.25)] rounded-r-lg" />
                            )}
                            <span className="relative z-10 text-foreground mix-blend-normal text-xs sm:text-sm">{format(day, "d")}</span>
                            <span className={cn(
                              "relative z-10 block w-full text-center leading-tight truncate",
                              "text-[7px] sm:text-[9px] md:text-[10px] text-primary-foreground"
                            )}>
                              <span className="hidden md:inline">{guestFullName}</span>
                              <span className="md:hidden">{guestFirstName}</span>
                            </span>
                          </div>
                        ) : (
                          <div className={getDayClasses(status, inMonth, today)}>
                            <span className="text-xs sm:text-sm">{format(day, "d")}</span>
                            {renderNameLabel(
                              status === "booked" ? "text-primary-foreground" :
                              status === "pending" ? "text-white/90" :
                              "text-foreground"
                            )}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    {booking ? (
                      <TooltipContent side="bottom" className="max-w-[240px]">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">{isBlocked ? "🔒 Blocage" : booking.guest_name}</p>
                          {isBlocked && blockReason && <p className="text-xs text-muted-foreground">{blockReason}</p>}
                          {!isBlocked && status === "blocked" && <p className="text-xs font-medium text-muted-foreground">🔒 Blocage</p>}
                          {status === "checkout-only" && <p className="text-xs text-primary font-medium">🚪 Départ</p>}
                          {status === "turnaround" && <p className="text-xs text-primary font-medium">🔄 Départ + Arrivée</p>}
                          {booking.guest_email && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{booking.guest_email}</span>
                            </div>
                          )}
                          {booking.guest_phone && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{booking.guest_phone}</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(booking.checkin_date), "d MMM", { locale: fr })} → {format(parseISO(booking.checkout_date), "d MMM", { locale: fr })}
                          </p>
                          <Badge variant="secondary" className="text-[10px]">
                            {STATUS_LABELS[booking.status] || booking.status}
                          </Badge>
                        </div>
                      </TooltipContent>
                    ) : status === "blocked" ? (
                      <TooltipContent side="bottom">
                        <p className="text-xs">Bloqué</p>
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 sm:grid-cols-6 sm:flex sm:items-center gap-2 sm:gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[hsl(var(--calendar-available)/0.3)] flex-shrink-0" />
                Disponible
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary flex-shrink-0" />
                Réservé
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[hsl(var(--warning)/0.8)] flex-shrink-0" />
                En attente
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[hsl(var(--calendar-blocked)/0.25)] flex-shrink-0" />
                Bloqué
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full overflow-hidden flex flex-shrink-0">
                  <div className="w-1/2 bg-[hsl(var(--calendar-available)/0.3)]" />
                  <div className="w-1/2 bg-primary/70" />
                </div>
                Arrivée
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full overflow-hidden flex flex-shrink-0">
                  <div className="w-1/2 bg-primary/70" />
                  <div className="w-1/2 bg-[hsl(var(--calendar-available)/0.3)]" />
                </div>
                Départ
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Upcoming bookings list */}
      {bookings && bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Réservations à venir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bookings
                .filter((b) => {
                  const matchesListing = listings.some((l) => l.id === b.listing_id);
                  return matchesListing && parseISO(b.checkout_date) >= new Date();
                })
                .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{booking.guest_name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {STATUS_LABELS[booking.status] || booking.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {booking.listing_title} — {format(parseISO(booking.checkin_date), "d MMM", { locale: fr })} au{" "}
                        {format(parseISO(booking.checkout_date), "d MMM yyyy", { locale: fr })}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {booking.guest_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {booking.guest_email}
                          </span>
                        )}
                        {booking.guest_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {booking.guest_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
