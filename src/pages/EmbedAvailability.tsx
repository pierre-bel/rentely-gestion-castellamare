import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Ban } from "lucide-react";
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
  isBefore,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function EmbedAvailability() {
  const { listingId } = useParams<{ listingId: string }>();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ["embed-listing", listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const { data, error } = await supabase
        .from("public_listings")
        .select("id, title, city, base_price")
        .eq("id", listingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!listingId,
  });

  const { data: bookedRanges = [] } = useQuery({
    queryKey: ["embed-booked", listingId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!listingId) return [];
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("bookings")
        .select("checkin_date, checkout_date")
        .eq("listing_id", listingId)
        .gte("checkout_date", rangeStart)
        .lte("checkin_date", rangeEnd)
        .in("status", ["confirmed", "pending_payment"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!listingId,
  });

  const { data: blockedDates = [] } = useQuery({
    queryKey: ["embed-blocked", listingId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!listingId) return [];
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("listing_availability")
        .select("start_date, end_date")
        .eq("listing_id", listingId)
        .gte("end_date", rangeStart)
        .lte("start_date", rangeEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!listingId,
  });

  const today = startOfDay(new Date());
  const nextMonth = addMonths(currentMonth, 1);
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const getDateStatus = (day: Date): "checkin" | "checkout" | "booked" | "blocked" | "available" | "past" => {
    if (isBefore(day, today)) return "past";
    const dateStr = format(day, "yyyy-MM-dd");

    let isCheckin = false;
    let isCheckout = false;
    let isMiddle = false;

    for (const b of bookedRanges) {
      if (b.checkin_date === dateStr) isCheckin = true;
      if (b.checkout_date === dateStr) isCheckout = true;
      if (dateStr > b.checkin_date && dateStr < b.checkout_date) isMiddle = true;
    }

    if (isMiddle) return "booked";
    if (isCheckin && isCheckout) return "booked"; // turnover
    if (isCheckin) return "checkin";
    if (isCheckout) return "checkout";

    for (const bd of blockedDates) {
      if (dateStr >= bd.start_date && dateStr <= bd.end_date) return "blocked";
    }

    return "available";
  };

  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    return (
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
            const status = getDateStatus(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "h-8 flex items-center justify-center text-xs bg-card",
                  !inMonth && "opacity-20",
                  isToday(day) && "font-bold ring-1 ring-inset ring-primary/50",
                  status === "available" && inMonth && "bg-[hsl(var(--calendar-available)/0.15)] text-foreground",
                  status === "booked" && inMonth && "bg-primary text-primary-foreground font-semibold",
                  status === "checkin" && inMonth && "embed-day-checkin",
                  status === "checkout" && inMonth && "embed-day-checkout",
                  status === "blocked" && inMonth && "bg-[hsl(var(--calendar-blocked)/0.15)] text-muted-foreground",
                  status === "past" && inMonth && "opacity-40",
                )}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (listingLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Annonce introuvable
      </div>
    );
  }

  return (
    <div className="p-3 font-sans bg-background text-foreground max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-3">
        <p className="font-semibold text-sm">{listing.title}</p>
        {listing.city && (
          <p className="text-xs text-muted-foreground">{listing.city}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCurrentMonth(new Date())}>
          Aujourd'hui
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Calendars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderMonth(currentMonth)}
        {renderMonth(nextMonth)}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-[hsl(var(--calendar-available))]" />
          Disponible
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-primary" />
          Réservé
        </div>
        <div className="flex items-center gap-1">
          <Ban className="h-3 w-3 text-[hsl(var(--calendar-blocked))]" />
          Indisponible
        </div>
      </div>
    </div>
  );
}
