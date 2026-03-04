import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, User, Phone, Mail } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
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

type DayStatus = "available" | "booked" | "pending" | "blocked" | "checkin-only" | "checkout-only" | "turnaround";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmée",
  pending_payment: "En attente",
  completed: "Terminée",
  cancelled: "Annulée",
  checked_in: "En cours",
};

export default function AvailabilityCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedListing, setSelectedListing] = useState<string | null>(null);

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
        .select("id, checkin_date, checkout_date, status, guests, notes, listing_id, guest_user_id")
        .in("listing_id", listingIds)
        .gte("checkout_date", rangeStart)
        .lte("checkin_date", rangeEnd)
        .not("status", "eq", "cancelled");

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Build listing title map
      const listingMap = new Map(listings.map((l) => [l.id, l.title]));

      // Fetch guest profiles separately
      const guestIds = [...new Set(data.map((b: any) => b.guest_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .in("id", guestIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return data.map((b: any) => {
        const profile = profileMap.get(b.guest_user_id);
        return {
          id: b.id,
          checkin_date: b.checkin_date,
          checkout_date: b.checkout_date,
          status: b.status,
          guests: b.guests,
          notes: b.notes,
          listing_id: b.listing_id,
          listing_title: listingMap.get(b.listing_id) || "—",
          guest_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Locataire" : "Locataire",
          guest_email: profile?.email || "",
          guest_phone: profile?.phone || null,
        };
      }) as BookingWithGuest[];
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
      // Check blocked
      const blocked = blockedDates?.some((bd) => {
        if (bd.listing_id !== listingId) return false;
        const s = parseISO(bd.start_date);
        const e = parseISO(bd.end_date);
        return day >= s && day <= e;
      });
      return { status: blocked ? "blocked" : "available", bookings: [] };
    }

    // Check if this day is ONLY a checkout day for some bookings and ONLY a checkin for others
    const isCheckinFor = dayBookings.filter((b) => isSameDay(day, parseISO(b.checkin_date)));
    const isCheckoutFor = dayBookings.filter((b) => isSameDay(day, parseISO(b.checkout_date)));
    const isMidStay = dayBookings.filter((b) => {
      const ci = parseISO(b.checkin_date);
      const co = parseISO(b.checkout_date);
      return day > ci && day < co;
    });

    // If there's any mid-stay booking, it's fully booked
    if (isMidStay.length > 0) {
      const isPending = isMidStay.some((b) => b.status === "pending_payment");
      return { status: isPending ? "pending" : "booked", bookings: dayBookings };
    }

    // Both checkin and checkout on same day (turnaround)
    if (isCheckinFor.length > 0 && isCheckoutFor.length > 0) {
      return { status: "turnaround", bookings: dayBookings };
    }

    // Only checkin day (first day of booking)
    if (isCheckinFor.length > 0 && isCheckoutFor.length === 0) {
      // Check if there's only one booking and this is its checkin — if the booking is multi-day, the checkin day is "checkin-only"
      const b = isCheckinFor[0];
      if (!isSameDay(parseISO(b.checkin_date), parseISO(b.checkout_date))) {
        return { status: "checkin-only", bookings: dayBookings };
      }
      // Single-day booking = fully booked
      return { status: "booked", bookings: dayBookings };
    }

    // Only checkout day
    if (isCheckoutFor.length > 0 && isCheckinFor.length === 0) {
      return { status: "checkout-only", bookings: dayBookings };
    }

    return { status: "booked", bookings: dayBookings };
  };

  const getDayClasses = (status: DayStatus, inMonth: boolean, today: boolean): string => {
    const base = "relative flex items-center justify-center h-10 w-10 rounded-full text-sm transition-all cursor-default select-none mx-auto";

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
        return cn(base, "font-medium", today && "ring-2 ring-primary");
      case "checkout-only":
        return cn(base, "font-medium", today && "ring-2 ring-primary");
      case "turnaround":
        return cn(base, "font-medium", today && "ring-2 ring-primary");
      default:
        return base;
    }
  };

  const isLoading = listingsLoading || bookingsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const weekDays = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  return (
    <div className="space-y-6">
      {/* Month navigation + Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h2>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs">
            Aujourd'hui
          </Button>
        </div>

        {listings && listings.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={selectedListing === null ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedListing(null)}
            >
              Tous ({listings.length})
            </Badge>
            {listings.map((l) => (
              <Badge
                key={l.id}
                variant={selectedListing === l.id ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedListing(selectedListing === l.id ? null : l.id)}
              >
                {l.title}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {filteredListings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucun bien trouvé. Créez votre premier bien pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        filteredListings.map((listing) => (
          <Card key={listing.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{listing.title}</CardTitle>
                <Badge variant={listing.status === "approved" ? "default" : "secondary"} className="text-xs">
                  {listing.status === "approved" ? "Actif" : listing.status}
                </Badge>
              </div>
              {listing.city && (
                <p className="text-xs text-muted-foreground">{listing.city}</p>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Week day headers */}
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((d) => (
                  <div key={d} className="text-center text-[0.7rem] font-medium text-muted-foreground uppercase py-1.5">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {calendarDays.map((day) => {
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const { status, bookings: dayBookings } = getDayStatus(day, listing.id);
                  const booking = dayBookings[0];

                  return (
                    <Tooltip key={day.toISOString()}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center">
                          {(status === "checkin-only" || status === "checkout-only" || status === "turnaround") ? (
                            <div className={cn(
                              "relative flex items-center justify-center h-10 w-10 rounded-full text-sm font-medium cursor-default select-none mx-auto overflow-hidden",
                              !inMonth && "opacity-20",
                              today && "ring-2 ring-primary",
                            )}>
                              {/* Half-circle backgrounds */}
                              {(status === "checkout-only" || status === "turnaround") && (
                                <div className="absolute inset-0 w-1/2 bg-primary/70 rounded-l-full" />
                              )}
                              {(status === "checkin-only" || status === "turnaround") && (
                                <div className="absolute right-0 inset-y-0 w-1/2 bg-primary/70 rounded-r-full" />
                              )}
                              {/* Empty halves get available color */}
                              {status === "checkin-only" && (
                                <div className="absolute inset-0 w-1/2 bg-[hsl(var(--calendar-available)/0.25)] rounded-l-full" />
                              )}
                              {status === "checkout-only" && (
                                <div className="absolute right-0 inset-y-0 w-1/2 bg-[hsl(var(--calendar-available)/0.25)] rounded-r-full" />
                              )}
                              <span className="relative z-10 text-foreground mix-blend-normal">{format(day, "d")}</span>
                            </div>
                          ) : (
                            <div className={getDayClasses(status, inMonth, today)}>
                              {format(day, "d")}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      {booking ? (
                        <TooltipContent side="bottom" className="max-w-[240px]">
                          <div className="space-y-1">
                            <p className="font-semibold text-sm">{booking.guest_name}</p>
                            {status === "checkin-only" && <p className="text-xs text-primary font-medium">🔑 Arrivée</p>}
                            {status === "checkout-only" && <p className="text-xs text-primary font-medium">🚪 Départ</p>}
                            {status === "turnaround" && <p className="text-xs text-primary font-medium">🔄 Départ + Arrivée</p>}
                            <div className="flex items-center gap-1.5 text-xs">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{booking.guest_email}</span>
                            </div>
                            {booking.guest_phone && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{booking.guest_phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span>{booking.guests} voyageur{booking.guests > 1 ? "s" : ""}</span>
                            </div>
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
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--calendar-available)/0.3)]" />
                  Disponible
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  Réservé
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--warning)/0.8)]" />
                  En attente
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--calendar-blocked)/0.25)]" />
                  Bloqué
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full overflow-hidden flex">
                    <div className="w-1/2 bg-[hsl(var(--calendar-available)/0.3)]" />
                    <div className="w-1/2 bg-primary/70" />
                  </div>
                  Arrivée
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full overflow-hidden flex">
                    <div className="w-1/2 bg-primary/70" />
                    <div className="w-1/2 bg-[hsl(var(--calendar-available)/0.3)]" />
                  </div>
                  Départ
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

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
                  if (selectedListing && b.listing_id !== selectedListing) return false;
                  return parseISO(b.checkout_date) >= new Date();
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
                    <div className="text-right text-xs text-muted-foreground">
                      {booking.guests} pers.
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
