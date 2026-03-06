import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle2, XCircle, Ban, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
  isBefore,
  startOfDay,
  isSameMonth,
} from "date-fns";
import { fr } from "date-fns/locale";

export default function EmbedAvailability() {
  const { listingId } = useParams<{ listingId: string }>();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = startOfDay(new Date());
  const currentMonthStart = startOfMonth(today);
  const canGoPrev = !isSameMonth(currentMonth, currentMonthStart) && !isBefore(startOfMonth(currentMonth), currentMonthStart);

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ["embed-listing", listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const { data, error } = await supabase
        .from("embed_listing_info")
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
        .from("public_booking_dates")
        .select("checkin_date, checkout_date")
        .eq("listing_id", listingId)
        .gte("checkout_date", rangeStart)
        .lte("checkin_date", rangeEnd);
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
        .from("public_listing_availability")
        .select("start_date, end_date")
        .eq("listing_id", listingId)
        .gte("end_date", rangeStart)
        .lte("start_date", rangeEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!listingId,
  });

  const getBookingType = (date: Date): "checkin" | "checkout" | "middle" | "single" | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    let isCheckin = false;
    let isCheckout = false;

    for (const b of bookedRanges) {
      if (b.checkin_date === dateStr) isCheckin = true;
      if (b.checkout_date === dateStr) isCheckout = true;
    }

    if (isCheckin && isCheckout) return "single";
    if (isCheckin) return "checkin";
    if (isCheckout) return "checkout";

    for (const b of bookedRanges) {
      const checkin = parseISO(b.checkin_date!);
      const checkout = parseISO(b.checkout_date!);
      if (isWithinInterval(date, { start: checkin, end: checkout })) return "middle";
    }
    return null;
  };

  const isBlocked = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    for (const bd of blockedDates) {
      if (dateStr >= bd.start_date! && dateStr <= bd.end_date!) return true;
    }
    return false;
  };

  const modifiers = {
    bookedCheckin: (date: Date) => getBookingType(date) === "checkin",
    bookedCheckout: (date: Date) => getBookingType(date) === "checkout",
    bookedMiddle: (date: Date) => getBookingType(date) === "middle",
    bookedTurnover: (date: Date) => getBookingType(date) === "single",
    blocked: (date: Date) => isBlocked(date) && getBookingType(date) === null,
    available: (date: Date) => !isBlocked(date) && getBookingType(date) === null && !isBefore(date, today),
  };

  const modifiersStyles = {
    blocked: { backgroundColor: "hsl(var(--calendar-blocked) / 0.3)", color: "hsl(var(--foreground))" },
    available: { backgroundColor: "hsl(var(--calendar-available) / 0.3)", color: "hsl(var(--foreground))" },
  };

  const nextMonth = addMonths(currentMonth, 1);

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
    <div className="p-4 font-sans bg-background text-foreground max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="font-semibold text-base">{listing.title}</p>
        {listing.city && (
          <p className="text-xs text-muted-foreground">{listing.city}</p>
        )}
      </div>

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

      {/* Calendar using the same Calendar component as host */}
      <div className="flex justify-center">
        <Calendar
          mode="single"
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          numberOfMonths={2}
          defaultMonth={currentMonth}
          disabled={(date) => isBefore(date, today)}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          modifiersClassNames={{
            bookedCheckin: "day-booked-checkin",
            bookedCheckout: "day-booked-checkout",
            bookedMiddle: "day-booked-middle",
            bookedTurnover: "day-booked-turnover",
          }}
          locale={fr}
          fromMonth={currentMonthStart}
          className="rounded-xl border"
          components={{
            // Hide default nav since we have our own
            IconLeft: () => <ChevronLeft className="h-4 w-4" />,
            IconRight: () => <ChevronRight className="h-4 w-4" />,
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[hsl(var(--calendar-available)/0.3)]" />
          <span className="text-muted-foreground">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary" />
          <span className="text-muted-foreground">Réservé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[hsl(var(--calendar-blocked)/0.3)]" />
          <span className="text-muted-foreground">Indisponible</span>
        </div>
      </div>
    </div>
  );
}
