import { useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isWeekend,
  addMonths,
  subMonths,
  parseISO,
  isBefore,
  startOfDay,
  isSameMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function EmbedAllAvailability() {
  const { hostId } = useParams<{ hostId: string }>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

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
        .from("embed_host_listings" as any)
        .select("id, title, city, base_price, bedrooms")
        .eq("host_user_id", hostId)
        .order("title");
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        title: string;
        city: string | null;
        base_price: number;
        bedrooms: number | null;
      }>;
    },
    enabled: !!hostId,
  });

  const hostListingIds = useMemo(() => (listings || []).map((l) => l.id), [listings]);

  // Fetch booked dates
  const { data: bookedRanges = [] } = useQuery({
    queryKey: ["embed-all-booked", hostListingIds, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (hostListingIds.length === 0) return [];
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 1)), "yyyy-MM-dd");
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
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 1)), "yyyy-MM-dd");
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

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }),
    [currentMonth]
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const CELL_W = isMobile ? 28 : 36;
  const LABEL_W = isMobile ? 90 : 130;

  const getBarStyle = (checkinStr: string, checkoutStr: string) => {
    const checkin = parseISO(checkinStr);
    const checkout = parseISO(checkoutStr);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const visibleStart = checkin < monthStart ? monthStart : checkin;
    const visibleEnd = checkout > monthEnd ? monthEnd : checkout;

    const startIdx = Math.max(0, Math.round((visibleStart.getTime() - monthStart.getTime()) / 86400000));
    const endIdx = Math.min(days.length - 1, Math.round((visibleEnd.getTime() - monthStart.getTime()) / 86400000));

    const halfCell = CELL_W / 2;
    const startsInMonth = checkin >= monthStart;
    const endsInMonth = checkout <= monthEnd;

    const left = startIdx * CELL_W + (startsInMonth ? halfCell : 0);
    const right = (endIdx + 1) * CELL_W - (endsInMonth ? halfCell : 0);
    const width = right - left - 2;

    return { left, width };
  };

  if (listingsLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Aucun appartement disponible
      </div>
    );
  }

  return (
    <div className="p-3 font-sans bg-background text-foreground max-w-5xl mx-auto">
      {/* Header + navigation */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm">Disponibilités</p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={!canGoPrev}
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 capitalize font-semibold min-w-[120px]"
            onClick={() => setCurrentMonth(new Date())}
          >
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="flex">
          {/* Listing labels column (fixed) */}
          <div className="flex-shrink-0 border-r border-border bg-card z-10" style={{ width: LABEL_W }}>
            <div className="h-9 border-b border-border flex items-center px-2">
              <span className="text-[10px] font-semibold text-muted-foreground">Biens</span>
            </div>
            {listings.map((listing) => (
              <div key={listing.id} className="h-12 border-b border-border flex flex-col justify-center px-2">
                <span className="text-xs font-medium truncate" title={listing.title}>
                  {listing.title}
                </span>
                {listing.city && (
                  <span className="text-[9px] text-muted-foreground truncate">{listing.city}</span>
                )}
              </div>
            ))}
          </div>

          {/* Scrollable timeline */}
          <div className="overflow-x-auto flex-1" ref={scrollRef}>
            <div style={{ minWidth: days.length * CELL_W }}>
              {/* Day headers */}
              <div className="flex h-9 border-b border-border">
                {days.map((day) => {
                  const todayDay = isToday(day);
                  const weekend = isWeekend(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "flex flex-col items-center justify-center text-[9px] border-r border-border/50 flex-shrink-0",
                        todayDay && "bg-primary/10 font-bold",
                        weekend && !todayDay && "bg-muted/50"
                      )}
                      style={{ width: CELL_W }}
                    >
                      <span className="uppercase text-muted-foreground leading-none">
                        {format(day, "EEE", { locale: fr }).slice(0, 2)}
                      </span>
                      <span className={cn("leading-none mt-0.5", todayDay && "text-primary font-bold")}>
                        {format(day, "d")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rows per listing */}
              {listings.map((listing) => {
                const listingBookings = bookedRanges.filter((b) => b.listing_id === listing.id);
                const listingBlocked = blockedDates.filter((bd) => bd.listing_id === listing.id);

                return (
                  <div key={listing.id} className="relative h-12 border-b border-border">
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {days.map((day) => {
                        const todayDay = isToday(day);
                        const weekend = isWeekend(day);
                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "border-r border-border/30 flex-shrink-0 h-full",
                              todayDay && "bg-primary/5",
                              weekend && !todayDay && "bg-muted/30"
                            )}
                            style={{ width: CELL_W }}
                          />
                        );
                      })}
                    </div>

                    {/* Blocked date bars */}
                    {listingBlocked.map((bd, idx) => {
                      const { left, width } = getBarStyle(bd.start_date!, bd.end_date!);
                      if (width <= 0) return null;
                      return (
                        <div
                          key={`blocked-${idx}`}
                          className="absolute top-1.5 bottom-1.5 rounded bg-[hsl(var(--calendar-blocked)/0.15)] border border-[hsl(var(--calendar-blocked)/0.3)]"
                          style={{ left: left + 2, width }}
                        />
                      );
                    })}

                    {/* Booking bars */}
                    {listingBookings.map((booking, idx) => {
                      const { left, width } = getBarStyle(booking.checkin_date!, booking.checkout_date!);
                      if (width <= 0) return null;
                      return (
                        <div
                          key={`booking-${idx}`}
                          className="absolute top-2 bottom-2 rounded-md bg-primary text-primary-foreground shadow-sm flex items-center px-1.5 overflow-hidden"
                          style={{ left: left + 2, width }}
                        >
                          <span className="text-[10px] font-medium truncate leading-none whitespace-nowrap">
                            Réservé
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-card border border-border" />
          <span className="text-muted-foreground">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Réservé</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[hsl(var(--calendar-blocked)/0.3)]" />
          <span className="text-muted-foreground">Bloqué</span>
        </div>
      </div>
    </div>
  );
}
