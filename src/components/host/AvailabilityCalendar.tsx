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
  isSameDay,
  isWithinInterval,
  parseISO,
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

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-primary/80 text-primary-foreground",
  pending_payment: "bg-warning/80 text-white",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/30 text-destructive-foreground line-through",
  checked_in: "bg-primary text-primary-foreground",
};

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

  // Fetch host's listings
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

  // Fetch bookings for the visible month range (with some padding)
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["host-calendar-bookings", user?.id, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!user) return [];
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 1)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, checkin_date, checkout_date, status, guests, notes,
          listing_id,
          listings!inner(title, host_user_id),
          profiles:guest_user_id(first_name, last_name, email, phone)
        `)
        .eq("listings.host_user_id", user.id)
        .gte("checkout_date", rangeStart)
        .lte("checkin_date", rangeEnd)
        .not("status", "eq", "cancelled");

      if (error) throw error;

      return (data || []).map((b: any) => ({
        id: b.id,
        checkin_date: b.checkin_date,
        checkout_date: b.checkout_date,
        status: b.status,
        guests: b.guests,
        notes: b.notes,
        listing_id: b.listing_id,
        listing_title: b.listings?.title || "—",
        guest_name: `${b.profiles?.first_name || ""} ${b.profiles?.last_name || ""}`.trim() || "Locataire",
        guest_email: b.profiles?.email || "",
        guest_phone: b.profiles?.phone || null,
      })) as BookingWithGuest[];
    },
    enabled: !!user,
  });

  // Fetch blocked dates (listing_availability)
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

  const getBookingsForDay = (day: Date, listingId: string) => {
    if (!bookings) return [];
    return bookings.filter(
      (b) =>
        b.listing_id === listingId &&
        isWithinInterval(day, {
          start: parseISO(b.checkin_date),
          end: parseISO(b.checkout_date),
        })
    );
  };

  const isBlocked = (day: Date, listingId: string) => {
    if (!blockedDates) return false;
    return blockedDates.some(
      (bd) =>
        bd.listing_id === listingId &&
        isWithinInterval(day, {
          start: parseISO(bd.start_date),
          end: parseISO(bd.end_date),
        })
    );
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

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-6">
      {/* Month navigation + Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold capitalize min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-sm">
            Aujourd'hui
          </Button>
        </div>

        {/* Listing filter */}
        {listings && listings.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={selectedListing === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedListing(null)}
            >
              Tous ({listings.length})
            </Badge>
            {listings.map((l) => (
              <Badge
                key={l.id}
                variant={selectedListing === l.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedListing(selectedListing === l.id ? null : l.id)}
              >
                {l.title}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Calendars per listing */}
      {filteredListings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucun bien trouvé. Créez votre premier bien pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        filteredListings.map((listing) => (
          <Card key={listing.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{listing.title}</CardTitle>
                <Badge variant={listing.status === "approved" ? "default" : "secondary"}>
                  {listing.status === "approved" ? "Actif" : listing.status}
                </Badge>
              </div>
              {listing.city && (
                <p className="text-sm text-muted-foreground">{listing.city}</p>
              )}
            </CardHeader>
            <CardContent>
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-px mb-1">
                {weekDays.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {calendarDays.map((day) => {
                  const dayBookings = getBookingsForDay(day, listing.id);
                  const blocked = isBlocked(day, listing.id);
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const hasBooking = dayBookings.length > 0;
                  const booking = dayBookings[0]; // Primary booking for the day

                  return (
                    <Tooltip key={day.toISOString()}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "min-h-[70px] p-1 bg-card transition-colors relative",
                            !inMonth && "opacity-40",
                            today && "ring-2 ring-inset ring-primary/50",
                            blocked && !hasBooking && "bg-destructive/10",
                          )}
                        >
                          <span
                            className={cn(
                              "text-xs font-medium block text-right",
                              today && "text-primary font-bold",
                              !inMonth && "text-muted-foreground"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {hasBooking && booking && (
                            <div
                              className={cn(
                                "text-[10px] leading-tight px-1 py-0.5 rounded mt-0.5 truncate",
                                STATUS_COLORS[booking.status] || "bg-primary/20 text-foreground"
                              )}
                            >
                              <span className="font-medium">{booking.guest_name}</span>
                            </div>
                          )}
                          {blocked && !hasBooking && (
                            <div className="text-[10px] text-destructive font-medium mt-1 text-center">
                              Bloqué
                            </div>
                          )}
                          {!hasBooking && !blocked && inMonth && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                              <div className="w-1.5 h-1.5 rounded-full bg-success/60" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      {hasBooking && booking && (
                        <TooltipContent side="bottom" className="max-w-[260px]">
                          <div className="space-y-1.5">
                            <p className="font-semibold">{booking.guest_name}</p>
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
                            {booking.notes && (
                              <p className="text-xs italic text-muted-foreground border-t pt-1">{booking.notes}</p>
                            )}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                  Disponible
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded bg-primary/80" />
                  Réservé
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded bg-warning/80" />
                  En attente
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded bg-destructive/30" />
                  Bloqué
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
            <CardTitle className="text-lg">Réservations à venir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bookings
                .filter((b) => {
                  if (selectedListing && b.listing_id !== selectedListing) return false;
                  return parseISO(b.checkout_date) >= new Date();
                })
                .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{booking.guest_name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {STATUS_LABELS[booking.status] || booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
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
                    <div className="text-right text-sm text-muted-foreground">
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
