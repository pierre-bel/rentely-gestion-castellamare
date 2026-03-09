import { useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CalendarDays, Search, CheckCircle2, XCircle, Euro, Info, Mail, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  isWithinInterval,
  differenceInDays,
  isSaturday,
  getDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { calculatePricingFromWeeklyRates } from "@/lib/pricingUtils";

interface WeeklyPricing {
  listing_id: string;
  week_start_date: string;
  weekly_rate: number;
  weekend_rate: number;
  extra_night_weekend_rate: number;
}

export default function EmbedAllAvailability() {
  const { hostId } = useParams<{ hostId: string }>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Simulator state
  const [checkinDate, setCheckinDate] = useState<Date | undefined>();
  const [checkoutDate, setCheckoutDate] = useState<Date | undefined>();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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
        .select("id, title, city, base_price, bedrooms, cover_image")
        .eq("host_user_id", hostId)
        .order("title");
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        title: string;
        city: string | null;
        base_price: number;
        bedrooms: number | null;
        cover_image: string | null;
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

  // Fetch weekly pricing for simulator
  const { data: weeklyPricing = [] } = useQuery({
    queryKey: ["embed-weekly-pricing", hostListingIds, checkinDate, checkoutDate],
    queryFn: async () => {
      if (!checkinDate || !checkoutDate || hostListingIds.length === 0) return [];
      const rangeStart = format(subMonths(checkinDate, 1), "yyyy-MM-dd");
      const rangeEnd = format(addMonths(checkoutDate, 1), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("public_listing_weekly_pricing" as any)
        .select("listing_id, week_start_date, weekly_rate, weekend_rate, extra_night_weekend_rate")
        .in("listing_id", hostListingIds)
        .gte("week_start_date", rangeStart)
        .lte("week_start_date", rangeEnd);
      if (error) throw error;
      return (data || []) as unknown as WeeklyPricing[];
    },
    enabled: !!checkinDate && !!checkoutDate && hostListingIds.length > 0,
  });

  // Fetch school holidays for this host
  const { data: schoolHolidays = [] } = useQuery({
    queryKey: ["embed-school-holidays", hostId],
    queryFn: async () => {
      if (!hostId) return [];
      const { data, error } = await supabase
        .from("public_host_school_holidays" as any)
        .select("start_date, end_date, label")
        .eq("host_user_id", hostId);
      if (error) throw error;
      return (data || []) as unknown as Array<{ start_date: string; end_date: string; label: string }>;
    },
    enabled: !!hostId,
  });

  // Fetch host contact info
  const { data: hostContact } = useQuery({
    queryKey: ["embed-host-contact", hostId],
    queryFn: async () => {
      if (!hostId) return null;
      const { data, error } = await supabase
        .from("public_host_contact" as any)
        .select("contact_email, contact_phone, contact_whatsapp")
        .eq("host_user_id", hostId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { contact_email: string | null; contact_phone: string | null; contact_whatsapp: string | null } | null;
    },
    enabled: !!hostId,
  });

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }),
    [currentMonth]
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const CELL_W = isMobile ? 28 : 36;
  const LABEL_W = isMobile ? 140 : 220; // Increased width for full names

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

// Fonction pour fusionner les périodes de réservation adjacentes ou qui se chevauchent
const mergeBookingPeriods = (bookings: Array<{ checkin_date: string; checkout_date: string }>) => {
  if (bookings.length === 0) return [];
  
  // Trier les réservations par date d'arrivée
  const sortedBookings = [...bookings].sort((a, b) => 
    parseISO(a.checkin_date).getTime() - parseISO(b.checkin_date).getTime()
  );
  
  const merged: Array<{ checkin_date: string; checkout_date: string }> = [];
  
  for (const booking of sortedBookings) {
    const checkinDate = parseISO(booking.checkin_date);
    const checkoutDate = parseISO(booking.checkout_date);
    
    if (merged.length === 0) {
      merged.push({ checkin_date: booking.checkin_date, checkout_date: booking.checkout_date });
    } else {
      const lastMerged = merged[merged.length - 1];
      const lastCheckout = parseISO(lastMerged.checkout_date);
      
      // Si la réservation actuelle commence le jour même où la précédente se termine
      // ou si elles se chevauchent, on les fusionne
      if (checkinDate <= lastCheckout || differenceInDays(checkinDate, lastCheckout) === 0) {
        // Étendre la période jusqu'à la fin la plus tardive
        const newCheckout = checkoutDate > lastCheckout ? checkoutDate : lastCheckout;
        lastMerged.checkout_date = format(newCheckout, 'yyyy-MM-dd');
      } else {
        // Sinon, ajouter une nouvelle période
        merged.push({ checkin_date: booking.checkin_date, checkout_date: booking.checkout_date });
      }
    }
  }
  
  return merged;
};

  // Simulator: check availability for a listing
  const checkListingAvailability = (listingId: string): boolean => {
    if (!checkinDate || !checkoutDate) return true;
    
    // Check bookings
    for (const booking of bookedRanges) {
      if (booking.listing_id !== listingId) continue;
      const bCheckin = parseISO(booking.checkin_date!);
      const bCheckout = parseISO(booking.checkout_date!);
      // Overlap check
      if (checkinDate < bCheckout && checkoutDate > bCheckin) {
        return false;
      }
    }
    
    // Check blocked dates
    for (const blocked of blockedDates) {
      if (blocked.listing_id !== listingId) continue;
      const bStart = parseISO(blocked.start_date!);
      const bEnd = parseISO(blocked.end_date!);
      if (checkinDate <= bEnd && checkoutDate > bStart) {
        return false;
      }
    }
    
    return true;
  };

  // Simulator: calculate price for a listing
  const calculateListingPrice = (listingId: string, basePrice: number): number | null => {
    if (!checkinDate || !checkoutDate) return null;
    
    const listingPricing = weeklyPricing.filter((p) => p.listing_id === listingId);
    const nights = differenceInDays(checkoutDate, checkinDate);
    
    if (listingPricing.length === 0) {
      // Fallback to base price
      return basePrice * nights;
    }
    
    const result = calculatePricingFromWeeklyRates(
      checkinDate,
      checkoutDate,
      listingPricing,
      basePrice * 7 // fallback weekly rate
    );
    
    return result.total;
  };

  // Check if dates are Saturday-to-Saturday
  const isSaturdayToSaturday = useMemo(() => {
    if (!checkinDate || !checkoutDate) return false;
    return getDay(checkinDate) === 6 && getDay(checkoutDate) === 6;
  }, [checkinDate, checkoutDate]);

  // Check if the selected period falls within school holidays
  const isInSchoolHolidays = useMemo(() => {
    if (!checkinDate || !checkoutDate || schoolHolidays.length === 0) return false;
    for (const holiday of schoolHolidays) {
      const hStart = parseISO(holiday.start_date);
      const hEnd = parseISO(holiday.end_date);
      // If the checkin falls within a holiday period
      if (checkinDate >= hStart && checkinDate <= hEnd) return true;
    }
    return false;
  }, [checkinDate, checkoutDate, schoolHolidays]);

  // Determine simulator display mode
  type SimulatorMode = "price" | "holidays_only_saturday" | "contact_required";
  const simulatorMode: SimulatorMode = useMemo(() => {
    if (!checkinDate || !checkoutDate) return "price";
    if (isSaturdayToSaturday) return "price";
    if (isInSchoolHolidays) return "holidays_only_saturday";
    return "contact_required";
  }, [checkinDate, checkoutDate, isSaturdayToSaturday, isInSchoolHolidays]);

  // Simulator results
  const simulatorResults = useMemo(() => {
    if (!checkinDate || !checkoutDate || !listings) return null;
    
    const nights = differenceInDays(checkoutDate, checkinDate);
    if (nights <= 0) return null;
    
    return listings.map((listing) => ({
      ...listing,
      isAvailable: checkListingAvailability(listing.id),
      price: simulatorMode === "price" ? calculateListingPrice(listing.id, listing.base_price) : null,
      nights,
    }));
  }, [checkinDate, checkoutDate, listings, bookedRanges, blockedDates, weeklyPricing, simulatorMode]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(price);

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
    <div className="p-3 font-sans bg-background text-foreground max-w-6xl mx-auto space-y-4">
      {/* Simulator Section */}
      <Card className="border-accent-cool/30 bg-gradient-to-r from-accent-cool/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-accent-cool" />
            <span className="font-semibold text-sm">Simulateur de disponibilité</span>
          </div>
          
          <div className="flex flex-wrap items-end gap-3">
            {/* Check-in date */}
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">Arrivée</label>
              <Popover open={checkinOpen} onOpenChange={setCheckinOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !checkinDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {checkinDate ? format(checkinDate, "d MMM yyyy", { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkinDate}
                    onSelect={(date) => {
                      setCheckinDate(date);
                      setCheckinOpen(false);
                      if (date && checkoutDate && date >= checkoutDate) {
                        setCheckoutDate(undefined);
                      }
                    }}
                    disabled={(date) => isBefore(date, today)}
                    initialFocus
                    locale={fr}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-out date */}
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">Départ</label>
              <Popover open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !checkoutDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {checkoutDate ? format(checkoutDate, "d MMM yyyy", { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkoutDate}
                    onSelect={(date) => {
                      setCheckoutDate(date);
                      setCheckoutOpen(false);
                    }}
                    disabled={(date) => isBefore(date, checkinDate || today) || (checkinDate && date <= checkinDate)}
                    initialFocus
                    locale={fr}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear button */}
            {(checkinDate || checkoutDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={() => {
                  setCheckinDate(undefined);
                  setCheckoutDate(undefined);
                }}
              >
                Effacer
              </Button>
            )}
          </div>

          {/* Results */}
          {simulatorResults && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {simulatorResults[0].nights} nuit{simulatorResults[0].nights > 1 ? "s" : ""} • {format(checkinDate!, "d MMM", { locale: fr })} → {format(checkoutDate!, "d MMM yyyy", { locale: fr })}
              </p>

              {/* Message for non Saturday-to-Saturday */}
              {simulatorMode === "holidays_only_saturday" && (
                <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                    En période de vacances scolaires, la location est uniquement du <strong>samedi au samedi</strong>. Ajustez vos dates pour voir le tarif.
                  </AlertDescription>
                </Alert>
              )}

              {simulatorMode === "contact_required" && (
                <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                    <p>Hors vacances scolaires, les réservations hors samedi-samedi sont possibles sur demande. Contactez-nous :</p>
                    {(hostContact?.contact_email || hostContact?.contact_phone) && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {hostContact.contact_email && (
                          <a href={`mailto:${hostContact.contact_email}`} className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300 hover:underline font-medium">
                            <Mail className="h-3.5 w-3.5" />
                            {hostContact.contact_email}
                          </a>
                        )}
                        {hostContact.contact_phone && (
                          <a href={`tel:${hostContact.contact_phone}`} className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300 hover:underline font-medium">
                            <Phone className="h-3.5 w-3.5" />
                            {hostContact.contact_phone}
                          </a>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Availability results (always shown) */}
              <div className="grid gap-2">
                {simulatorResults.map((result) => (
                  <div
                    key={result.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      result.isAvailable
                        ? "bg-success/5 border-success/30"
                        : "bg-destructive/5 border-destructive/20 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {result.isAvailable ? (
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{result.title}</p>
                        {result.city && (
                          <p className="text-xs text-muted-foreground">{result.city}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {result.isAvailable ? (
                        simulatorMode === "price" ? (
                          result.price ? (
                            <div>
                              <p className="font-bold text-success">{formatPrice(result.price)}</p>
                              <p className="text-[10px] text-muted-foreground">
                                ~{formatPrice(result.price / result.nights)}/nuit
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Prix sur demande</span>
                          )
                        ) : (
                          <span className="text-xs text-success font-medium">Disponible</span>
                        )
                      ) : (
                        <span className="text-xs text-destructive font-medium">Indisponible</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Beta + cleaning fee notice */}
              {simulatorMode === "price" && simulatorResults.some((r) => r.isAvailable && r.price) && (
                <div className="text-[11px] text-muted-foreground space-y-0.5 border-t pt-2">
                  <p>⚠️ <strong>Version bêta</strong> — Le tarif affiché est indicatif et peut contenir des erreurs.</p>
                  <p>Le tarif ne comprend pas les frais de nettoyage (45 €).</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header + navigation */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">Calendrier des disponibilités</p>
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
            <div className="h-9 border-b border-border flex items-center px-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Appartements</span>
            </div>
            {listings.map((listing) => (
              <div key={listing.id} className="h-14 border-b border-border flex items-center gap-2 px-3">
                {listing.cover_image && (
                  <img
                    src={listing.cover_image}
                    alt=""
                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium block leading-tight" title={listing.title}>
                    {listing.title}
                  </span>
                  {listing.city && (
                    <span className="text-[10px] text-muted-foreground block leading-tight">{listing.city}</span>
                  )}
                </div>
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
                  <div key={listing.id} className="relative h-14 border-b border-border">
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
                          className="absolute top-2 bottom-2 rounded bg-[hsl(var(--calendar-blocked)/0.15)] border border-[hsl(var(--calendar-blocked)/0.3)]"
                          style={{ left: left + 2, width }}
                        />
                      );
                    })}

                    {/* Booking bars */}
                    {mergeBookingPeriods(listingBookings).map((period, idx) => {
                      const { left, width } = getBarStyle(period.checkin_date, period.checkout_date);
                      if (width <= 0) return null;
                      return (
                        <div
                          key={`booking-${idx}`}
                          className="absolute top-2.5 bottom-2.5 rounded-md bg-primary text-primary-foreground shadow-sm flex items-center px-2 overflow-hidden"
                          style={{ left: left + 2, width }}
                        >
                          <span className="text-[10px] font-medium truncate leading-none whitespace-nowrap">
                            Loué
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
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-card border border-border" />
          <span className="text-muted-foreground">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Loué</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[hsl(var(--calendar-blocked)/0.3)]" />
          <span className="text-muted-foreground">Bloqué</span>
        </div>
      </div>
    </div>
  );
}
