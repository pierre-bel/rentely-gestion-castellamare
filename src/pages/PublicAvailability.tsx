import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Search,
  Info,
  Mail,
  Phone,
  Send,
} from "lucide-react";
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
  differenceInDays,
  getDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { calculatePricingFromWeeklyRates } from "@/lib/pricingUtils";
import BookingInquiryForm from "@/components/embed/BookingInquiryForm";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface WeeklyPricing {
  listing_id: string;
  week_start_date: string;
  weekly_rate: number;
  weekend_rate: number;
  extra_night_weekend_rate: number;
}

export default function PublicAvailability() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedListing, setSelectedListing] = useState<string | null>(null);

  // Simulator state
  const [checkinDate, setCheckinDate] = useState<Date | undefined>();
  const [checkoutDate, setCheckoutDate] = useState<Date | undefined>();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [inquiryListingId, setInquiryListingId] = useState<string | null>(null);

  const today = startOfDay(new Date());

  // Fetch approved listings (public) — now includes host_user_id
  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["public-listings-availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_listings")
        .select("id, host_user_id, title, city, cover_image, bedrooms, beds, bathrooms, guests_max, base_price, cleaning_fee")
        .order("title");
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        host_user_id: string;
        title: string;
        city: string | null;
        cover_image: string | null;
        bedrooms: number | null;
        beds: number | null;
        bathrooms: number | null;
        guests_max: number | null;
        base_price: number;
        cleaning_fee: number | null;
      }>;
    },
  });

  // Derive hostId from first listing
  const hostId = useMemo(() => listings?.[0]?.host_user_id || null, [listings]);
  const listingIds = useMemo(() => (listings || []).map((l) => l.id), [listings]);

  // Fetch bookings
  const { data: bookedRanges = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["public-booked-ranges", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("public_booking_dates")
        .select("listing_id, checkin_date, checkout_date")
        .gte("checkout_date", rangeStart)
        .lte("checkin_date", rangeEnd);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch blocked dates
  const { data: blockedDates = [] } = useQuery({
    queryKey: ["public-blocked-dates", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("public_listing_availability")
        .select("listing_id, start_date, end_date")
        .gte("end_date", rangeStart)
        .lte("start_date", rangeEnd);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch weekly pricing for simulator
  const { data: weeklyPricing = [] } = useQuery({
    queryKey: ["public-weekly-pricing", listingIds, checkinDate, checkoutDate],
    queryFn: async () => {
      if (!checkinDate || !checkoutDate || listingIds.length === 0) return [];
      const rangeStart = format(subMonths(checkinDate, 1), "yyyy-MM-dd");
      const rangeEnd = format(addMonths(checkoutDate, 1), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("public_listing_weekly_pricing" as any)
        .select("listing_id, week_start_date, weekly_rate, weekend_rate, extra_night_weekend_rate")
        .in("listing_id", listingIds)
        .gte("week_start_date", rangeStart)
        .lte("week_start_date", rangeEnd);
      if (error) throw error;
      return (data || []) as unknown as WeeklyPricing[];
    },
    enabled: !!checkinDate && !!checkoutDate && listingIds.length > 0,
  });

  // Fetch school holidays
  const { data: schoolHolidays = [] } = useQuery({
    queryKey: ["public-school-holidays", hostId],
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
    queryKey: ["public-host-contact", hostId],
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

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    if (selectedListing) return listings.filter((l) => l.id === selectedListing);
    return listings;
  }, [listings, selectedListing]);

  // Calendar grid setup — two months side by side
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = addMonths(currentMonth, 1);
  const nextMonthStart = startOfMonth(nextMonth);
  const nextMonthEnd = endOfMonth(nextMonth);
  const nextCalendarStart = startOfWeek(nextMonthStart, { weekStartsOn: 1 });
  const nextCalendarEnd = endOfWeek(nextMonthEnd, { weekStartsOn: 1 });
  const nextCalendarDays = eachDayOfInterval({ start: nextCalendarStart, end: nextCalendarEnd });

  const isDayBooked = (day: Date, listingId: string) => {
    return bookedRanges.some(
      (b) =>
        b.listing_id === listingId &&
        isWithinInterval(day, { start: parseISO(b.checkin_date), end: parseISO(b.checkout_date) })
    );
  };

  const isDayBlocked = (day: Date, listingId: string) => {
    return blockedDates.some(
      (bd) =>
        bd.listing_id === listingId &&
        isWithinInterval(day, { start: parseISO(bd.start_date), end: parseISO(bd.end_date) })
    );
  };

  // Simulator helpers
  const checkListingAvailability = (listingId: string): boolean => {
    if (!checkinDate || !checkoutDate) return true;
    for (const booking of bookedRanges) {
      if (booking.listing_id !== listingId) continue;
      const bCheckin = parseISO(booking.checkin_date!);
      const bCheckout = parseISO(booking.checkout_date!);
      if (checkinDate < bCheckout && checkoutDate > bCheckin) return false;
    }
    for (const blocked of blockedDates) {
      if (blocked.listing_id !== listingId) continue;
      const bStart = parseISO(blocked.start_date!);
      const bEnd = parseISO(blocked.end_date!);
      if (checkinDate <= bEnd && checkoutDate > bStart) return false;
    }
    return true;
  };

  const calculateListingPrice = (listingId: string, basePrice: number): number | null => {
    if (!checkinDate || !checkoutDate) return null;
    const listingPricing = weeklyPricing.filter((p) => p.listing_id === listingId);
    if (listingPricing.length === 0) {
      return basePrice * differenceInDays(checkoutDate, checkinDate);
    }
    const result = calculatePricingFromWeeklyRates(checkinDate, checkoutDate, listingPricing, basePrice * 7);
    return result.total;
  };

  const isSaturdayToSaturday = useMemo(() => {
    if (!checkinDate || !checkoutDate) return false;
    return getDay(checkinDate) === 6 && getDay(checkoutDate) === 6;
  }, [checkinDate, checkoutDate]);

  const isInSchoolHolidays = useMemo(() => {
    if (!checkinDate || schoolHolidays.length === 0) return false;
    for (const holiday of schoolHolidays) {
      const hStart = parseISO(holiday.start_date);
      const hEnd = parseISO(holiday.end_date);
      if (checkinDate >= hStart && checkinDate <= hEnd) return true;
    }
    return false;
  }, [checkinDate, schoolHolidays]);

  type SimulatorMode = "price" | "holidays_only_saturday" | "contact_required";
  const simulatorMode: SimulatorMode = useMemo(() => {
    if (!checkinDate || !checkoutDate) return "price";
    if (isSaturdayToSaturday) return "price";
    if (isInSchoolHolidays) return "holidays_only_saturday";
    return "contact_required";
  }, [checkinDate, checkoutDate, isSaturdayToSaturday, isInSchoolHolidays]);

  const simulatorResults = useMemo(() => {
    if (!checkinDate || !checkoutDate || !filteredListings.length) return null;
    const nights = differenceInDays(checkoutDate, checkinDate);
    if (nights <= 0) return null;
    return filteredListings.map((listing) => ({
      ...listing,
      isAvailable: checkListingAvailability(listing.id),
      price: simulatorMode === "price" ? calculateListingPrice(listing.id, listing.base_price) : null,
      nights,
    }));
  }, [checkinDate, checkoutDate, filteredListings, bookedRanges, blockedDates, weeklyPricing, simulatorMode]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(price);

  const isLoading = listingsLoading || bookingsLoading;
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

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
                "h-10 flex flex-col items-center justify-center text-sm bg-card transition-colors",
                !inMonth && "opacity-30",
                isToday(day) && "font-bold",
                booked && inMonth && "bg-destructive/10 text-muted-foreground",
                blocked && !booked && inMonth && "bg-muted text-muted-foreground",
                !unavailable && inMonth && "bg-success/10 text-foreground font-medium",
                isPast && inMonth && "opacity-50"
              )}
            >
              <span>{format(day, "d")}</span>
              {booked && inMonth && !isPast && (
                <span className="text-[9px] leading-none text-destructive font-medium">Loué</span>
              )}
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
        ) : filteredListings.length === 0 && !selectedListing ? (
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

            {/* Simulator Section */}
            <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Simulateur de disponibilité et tarif</span>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  {/* Check-in */}
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Arrivée</label>
                    <Popover open={checkinOpen} onOpenChange={setCheckinOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
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

                  {/* Check-out */}
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Départ</label>
                    <Popover open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
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
                          disabled={(date) => isBefore(date, checkinDate || today) || (!!checkinDate && date <= checkinDate)}
                          initialFocus
                          locale={fr}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {(checkinDate || checkoutDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCheckinDate(undefined);
                        setCheckoutDate(undefined);
                        setInquiryListingId(null);
                      }}
                    >
                      Effacer
                    </Button>
                  )}
                </div>

                {/* Results */}
                {simulatorResults && (
                  <div className="mt-5 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {simulatorResults[0].nights} nuit{simulatorResults[0].nights > 1 ? "s" : ""} • {format(checkinDate!, "d MMM", { locale: fr })} → {format(checkoutDate!, "d MMM yyyy", { locale: fr })}
                    </p>

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
                          <p>Hors vacances scolaires, les réservations hors samedi-samedi sont possibles sur demande.</p>
                          <p className="mt-1 text-xs">Utilisez le bouton <strong>«&nbsp;Demande&nbsp;»</strong> ci-dessous pour envoyer votre demande.</p>
                          {(hostContact?.contact_email || hostContact?.contact_phone) && (
                            <div className="flex flex-wrap gap-3 mt-2">
                              {hostContact.contact_email && (
                                <a href={`mailto:${hostContact.contact_email}`} className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300 hover:underline font-medium text-xs">
                                  <Mail className="h-3.5 w-3.5" />
                                  {hostContact.contact_email}
                                </a>
                              )}
                              {hostContact.contact_phone && (
                                <a href={`tel:${hostContact.contact_phone}`} className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300 hover:underline font-medium text-xs">
                                  <Phone className="h-3.5 w-3.5" />
                                  {hostContact.contact_phone}
                                </a>
                              )}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Results per listing */}
                    <div className="grid gap-2">
                      {simulatorResults.map((result) => (
                        <div key={result.id}>
                          <div
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
                                {result.city && <p className="text-xs text-muted-foreground">{result.city}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                              <div className="text-right">
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
                              {result.isAvailable && (
                                <Button
                                  size="sm"
                                  variant={inquiryListingId === result.id ? "secondary" : "default"}
                                  className="h-7 text-xs gap-1"
                                  onClick={() => setInquiryListingId(inquiryListingId === result.id ? null : result.id)}
                                >
                                  <Send className="h-3 w-3" />
                                  Demande
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Inquiry form */}
                          {inquiryListingId === result.id && hostId && checkinDate && checkoutDate && (
                            <div className="border border-t-0 rounded-b-lg p-3 bg-card">
                              <BookingInquiryForm
                                hostId={hostId}
                                listingTitle={result.title}
                                checkinDate={format(checkinDate, "d MMMM yyyy", { locale: fr })}
                                checkoutDate={format(checkoutDate, "d MMMM yyyy", { locale: fr })}
                                nights={result.nights}
                                price={result.price}
                                onClose={() => setInquiryListingId(null)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Beta notice */}
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

            {/* Calendar navigation */}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderMonth(currentMonth, calendarDays, listing.id)}
                    {renderMonth(nextMonth, nextCalendarDays, listing.id)}
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
