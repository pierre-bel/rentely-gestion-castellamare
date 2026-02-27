import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
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
  isWithinInterval,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PublicAvailability() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedListing, setSelectedListing] = useState<string | null>(null);

  // Fetch approved listings (public)
  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["public-listings-availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_listings")
        .select("id, title, city, cover_image, bedrooms, beds, bathrooms, guests_max, base_price")
        .order("title");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch bookings to know which dates are taken (only confirmed/checked_in)
  const { data: bookedRanges, isLoading: bookingsLoading } = useQuery({
    queryKey: ["public-booked-ranges", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("bookings")
        .select("listing_id, checkin_date, checkout_date, status")
        .gte("checkout_date", rangeStart)
        .lte("checkin_date", rangeEnd)
        .in("status", ["confirmed", "pending_payment"]);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch blocked dates
  const { data: blockedDates } = useQuery({
    queryKey: ["public-blocked-dates", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("listing_availability")
        .select("listing_id, start_date, end_date")
        .gte("end_date", rangeStart)
        .lte("start_date", rangeEnd);

      if (error) throw error;
      return data || [];
    },
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

  const isDayBooked = (day: Date, listingId: string) => {
    if (!bookedRanges) return false;
    return bookedRanges.some(
      (b) =>
        b.listing_id === listingId &&
        isWithinInterval(day, {
          start: parseISO(b.checkin_date),
          end: parseISO(b.checkout_date),
        })
    );
  };

  const isDayBlocked = (day: Date, listingId: string) => {
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
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const today = startOfDay(new Date());

  // Show 2 months side by side
  const nextMonth = addMonths(currentMonth, 1);
  const nextMonthStart = startOfMonth(nextMonth);
  const nextMonthEnd = endOfMonth(nextMonth);
  const nextCalendarStart = startOfWeek(nextMonthStart, { weekStartsOn: 1 });
  const nextCalendarEnd = endOfWeek(nextMonthEnd, { weekStartsOn: 1 });
  const nextCalendarDays = eachDayOfInterval({ start: nextCalendarStart, end: nextCalendarEnd });

  const renderMonth = (monthDate: Date, days: Date[], listingId: string) => (
    <div>
      <h3 className="text-center font-semibold capitalize mb-2">
        {format(monthDate, "MMMM yyyy", { locale: fr })}
      </h3>
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const inMonth = isSameMonth(day, monthDate);
          const isPast = isBefore(day, today);
          const booked = isDayBooked(day, listingId);
          const blocked = isDayBlocked(day, listingId);
          const unavailable = booked || blocked || isPast;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "h-10 flex items-center justify-center text-sm bg-card transition-colors",
                !inMonth && "opacity-30",
                isToday(day) && "font-bold",
                unavailable && inMonth && "bg-destructive/10 text-muted-foreground",
                !unavailable && inMonth && "bg-success/10 text-foreground font-medium",
                isPast && inMonth && "opacity-50"
              )}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Disponibilités</h1>
          <p className="text-muted-foreground">
            Consultez les disponibilités de nos appartements en temps réel
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : filteredListings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Aucun appartement disponible pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Listing filter */}
            {listings && listings.length > 1 && (
              <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                <Badge
                  variant={selectedListing === null ? "default" : "outline"}
                  className="cursor-pointer text-sm px-3 py-1"
                  onClick={() => setSelectedListing(null)}
                >
                  Tous les appartements
                </Badge>
                {listings.map((l) => (
                  <Badge
                    key={l.id}
                    variant={selectedListing === l.id ? "default" : "outline"}
                    className="cursor-pointer text-sm px-3 py-1"
                    onClick={() => setSelectedListing(selectedListing === l.id ? null : l.id)}
                  >
                    {l.title}
                  </Badge>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {filteredListings.map((listing) => (
              <Card key={listing.id} className="mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    {listing.cover_image && (
                      <img
                        src={listing.cover_image}
                        alt={listing.title || ""}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <CardTitle className="text-lg">{listing.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {listing.city}
                        {listing.bedrooms ? ` • ${listing.bedrooms} ch.` : ""}
                        {listing.guests_max ? ` • ${listing.guests_max} pers. max` : ""}
                      </p>
                      {listing.base_price && (
                        <p className="text-sm font-medium text-primary mt-0.5">
                          À partir de {listing.base_price}€ / nuit
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Two months side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderMonth(currentMonth, calendarDays, listing.id!)}
                    {renderMonth(nextMonth, nextCalendarDays, listing.id!)}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Disponible
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Réservé
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
