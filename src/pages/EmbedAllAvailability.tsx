import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function EmbedAllAvailability() {
  const { hostId } = useParams<{ hostId: string }>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedListing, setSelectedListing] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const currentMonthStart = startOfMonth(today);
  const canGoPrev =
    !isSameMonth(currentMonth, currentMonthStart) &&
    !isBefore(startOfMonth(currentMonth), currentMonthStart);

  // Fetch approved listings for this host
  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["embed-host-listings", hostId],
    queryFn: async () => {
      if (!hostId) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, city, base_price, cover_image, bedrooms")
        .eq("host_user_id", hostId)
        .in("status", ["approved", "pending"])
        .order("title");
      if (error) throw error;
      return data || [];
    },
    enabled: !!hostId,
  });

  // We need to filter listings by host. public_listings view doesn't expose host_user_id.
  // Use embed_listing_info or a direct query. Let's use a separate query to get listing IDs for this host.
  const hostListingIds = useMemo(() => {
    return (listings || []).map((l) => l.id);
  }, [listings]);

  const filteredByHost = useMemo(() => {
    return listings || [];
  }, [listings]);

  const displayListings = useMemo(() => {
    if (selectedListing) return filteredByHost.filter((l) => l.id === selectedListing);
    return filteredByHost;
  }, [filteredByHost, selectedListing]);

  // Fetch booked dates
  const { data: bookedRanges = [] } = useQuery({
    queryKey: ["embed-all-booked", hostListingIds, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (hostListingIds.length === 0) return [];
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("public_booking_dates")
        .select("listing_id, checkin_date, checkout_date")
        .in("listing_id", hostListingIds)
        .gte("checkout_date", rangeStart)
        .lte("checkin_date", rangeEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: hostListingIds.length > 0,
  });

  // Fetch blocked dates
  const { data: blockedDates = [] } = useQuery({
    queryKey: ["embed-all-blocked", hostListingIds, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (hostListingIds.length === 0) return [];
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("public_listing_availability")
        .select("listing_id, start_date, end_date")
        .in("listing_id", hostListingIds)
        .gte("end_date", rangeStart)
        .lte("start_date", rangeEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: hostListingIds.length > 0,
  });

  const isDayBooked = (day: Date, listingId: string) => {
    return bookedRanges.some(
      (b) =>
        b.listing_id === listingId &&
        isWithinInterval(day, {
          start: parseISO(b.checkin_date!),
          end: parseISO(b.checkout_date!),
        })
    );
  };

  const isDayBlocked = (day: Date, listingId: string) => {
    return blockedDates.some(
      (bd) =>
        bd.listing_id === listingId &&
        isWithinInterval(day, {
          start: parseISO(bd.start_date!),
          end: parseISO(bd.end_date!),
        })
    );
  };

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const nextMonth = addMonths(currentMonth, 1);

  const getMonthDays = (monthDate: Date) => {
    const ms = startOfMonth(monthDate);
    const me = endOfMonth(monthDate);
    const cs = startOfWeek(ms, { weekStartsOn: 1 });
    const ce = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: cs, end: ce });
  };

  const currentDays = getMonthDays(currentMonth);
  const nextDays = getMonthDays(nextMonth);

  const renderMonth = (monthDate: Date, days: Date[], listingId: string) => (
    <div>
      <h3 className="text-center font-semibold capitalize mb-2 text-sm">
        {format(monthDate, "MMMM yyyy", { locale: fr })}
      </h3>
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">
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
                "h-8 flex items-center justify-center text-xs bg-card transition-colors",
                !inMonth && "opacity-30",
                isToday(day) && "font-bold ring-1 ring-primary/30",
                unavailable && inMonth && "bg-destructive/10 text-muted-foreground",
                !unavailable && inMonth && "bg-[hsl(var(--calendar-available)/0.2)] text-foreground font-medium",
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

  if (listingsLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (filteredByHost.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Aucun appartement disponible
      </div>
    );
  }

  return (
    <div className="p-4 font-sans bg-background text-foreground max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="font-semibold text-base">Disponibilités</p>
        <p className="text-xs text-muted-foreground">
          {filteredByHost.length} appartement{filteredByHost.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Listing filter */}
      {filteredByHost.length > 1 && (
        <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
          <Badge
            variant={selectedListing === null ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setSelectedListing(null)}
          >
            Tous
          </Badge>
          {filteredByHost.map((l) => (
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

      {/* Navigation */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={!canGoPrev}
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-8"
          onClick={() => setCurrentMonth(new Date())}
        >
          Aujourd'hui
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendars per listing */}
      <div className="space-y-6">
        {displayListings.map((listing) => (
          <div key={listing.id} className="border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {listing.cover_image && (
                <img
                  src={listing.cover_image}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-semibold text-sm">{listing.title}</p>
                {listing.city && (
                  <p className="text-xs text-muted-foreground">{listing.city}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderMonth(currentMonth, currentDays, listing.id!)}
              {renderMonth(nextMonth, nextDays, listing.id!)}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t text-xs">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--calendar-available))]" />
          <span className="text-muted-foreground">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-muted-foreground">Indisponible</span>
        </div>
      </div>
    </div>
  );
}
