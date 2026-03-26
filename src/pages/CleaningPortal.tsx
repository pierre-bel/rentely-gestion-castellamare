import { useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SprayCan, ChevronLeft, ChevronRight, Calendar, User, Phone, Clock, Moon,
  ArrowRightLeft,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO,
  differenceInCalendarDays, isBefore, startOfDay, isSameDay,
  eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";

interface PortalBooking {
  id: string;
  checkin_date: string;
  checkout_date: string;
  checkin_time: string | null;
  checkout_time: string | null;
  nights: number;
  status: string;
  tenant_name: string;
  tenant_phone: string | null;
}

interface PortalListing {
  id: string;
  title: string;
  checkin_from: string | null;
  checkout_until: string | null;
  bookings: PortalBooking[];
}

interface PortalData {
  staff_name: string;
  portal_past_months: number;
  portal_future_months: number;
  listings: PortalListing[];
}

export default function CleaningPortal() {
  const { token } = useParams<{ token: string }>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<{ booking: PortalBooking; listing: PortalListing } | null>(null);

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // For the calendar view, fetch current month data
  const { data: portalData, isLoading, error } = useQuery({
    queryKey: ["cleaning-portal", token, format(monthStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_cleaning_portal_data", {
        p_token: token,
        p_month_start: format(monthStart, "yyyy-MM-dd"),
        p_month_end: format(monthEnd, "yyyy-MM-dd"),
      });
      if (error) throw error;
      return data as unknown as PortalData;
    },
    enabled: !!token,
  });

  // For the rotation summary, fetch current month + next month
  const nextMonthEnd = endOfMonth(addMonths(currentMonth, 1));
  const { data: summaryData } = useQuery({
    queryKey: ["cleaning-portal-summary", token, format(monthStart, "yyyy-MM-dd"), format(nextMonthEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_cleaning_portal_data", {
        p_token: token,
        p_month_start: format(monthStart, "yyyy-MM-dd"),
        p_month_end: format(nextMonthEnd, "yyyy-MM-dd"),
      });
      if (error) throw error;
      return data as unknown as PortalData;
    },
    enabled: !!token,
  });

  // Build cleaning slots from summary data (2 months)
  const cleaningSlots = useMemo(() => {
    const source = summaryData || portalData;
    if (!source) return [];
    const slots: {
      date: Date;
      listing: PortalListing;
      outgoing: PortalBooking;
      incoming: PortalBooking | null;
      hoursAvailable: number | null;
    }[] = [];

    for (const listing of source.listings) {
      const sorted = [...listing.bookings].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
      for (let i = 0; i < sorted.length; i++) {
        const b = sorted[i];
        const checkoutDate = parseISO(b.checkout_date);
        if (isBefore(checkoutDate, monthStart) || isBefore(nextMonthEnd, checkoutDate)) continue;
        const next = sorted[i + 1] || null;
        const hoursAvailable = next
          ? differenceInCalendarDays(parseISO(next.checkin_date), checkoutDate) * 24
          : null;
        slots.push({ date: checkoutDate, listing, outgoing: b, incoming: next, hoursAvailable });
      }
    }
    return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [summaryData, portalData, monthStart, nextMonthEnd]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <SprayCan className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground text-sm">Ce lien de planning ménage n'est pas valide ou a expiré.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isUrgent = (hours: number | null) => hours !== null && hours <= 24;
  const isTight = (hours: number | null) => hours !== null && hours <= 48 && !isUrgent(hours);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <SprayCan className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Planning Ménage</h1>
              <p className="text-sm opacity-80">{portalData.staff_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Month navigation with limits */}
        {(() => {
          const now = new Date();
          const pastMonths = portalData?.portal_past_months ?? 1;
          const futureMonths = portalData?.portal_future_months ?? 3;
          const minMonth = startOfMonth(subMonths(now, pastMonths));
          const maxMonth = startOfMonth(addMonths(now, futureMonths));
          const canGoPrev = startOfMonth(subMonths(currentMonth, 1)) >= minMonth;
          const canGoNext = startOfMonth(addMonths(currentMonth, 1)) <= maxMonth;
          return (
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" disabled={!canGoPrev} onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold capitalize w-[200px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </span>
              <Button variant="outline" size="icon" disabled={!canGoNext} onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          );
        })()}

        {/* Calendars per listing */}
        {portalData.listings.map(listing => (
          <ListingCalendar
            key={listing.id}
            listing={listing}
            currentMonth={currentMonth}
            monthStart={monthStart}
            monthEnd={monthEnd}
            today={today}
            onSelectBooking={(booking) => setSelectedBooking({ booking, listing })}
            selectedBookingId={selectedBooking?.booking.id}
          />
        ))}

        {/* Selected booking detail */}
        {selectedBooking && (
          <Card className="border-primary/30 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Détail — {selectedBooking.listing.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedBooking.booking.tenant_name}</span>
                  </div>
                  {selectedBooking.booking.tenant_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedBooking.booking.tenant_phone}`} className="text-primary underline">
                        {selectedBooking.booking.tenant_phone}
                      </a>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(parseISO(selectedBooking.booking.checkin_date), "EEEE dd MMM", { locale: fr })} → {format(parseISO(selectedBooking.booking.checkout_date), "EEEE dd MMM", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedBooking.booking.nights} nuit{selectedBooking.booking.nights > 1 ? "s" : ""}</span>
                  </div>
                  {(selectedBooking.booking.checkin_time || selectedBooking.listing.checkin_from) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Arrivée dès {(selectedBooking.booking.checkin_time || selectedBooking.listing.checkin_from)?.slice(0, 5)} — Départ avant {(selectedBooking.booking.checkout_time || selectedBooking.listing.checkout_until)?.slice(0, 5)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Divider */}
        <Separator />

        {/* Summary section */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Récapitulatif des rotations — {format(currentMonth, "MMMM", { locale: fr })} & {format(addMonths(currentMonth, 1), "MMMM yyyy", { locale: fr })}
          </h2>

          {cleaningSlots.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <SprayCan className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun ménage prévu ce mois-ci.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(() => {
                const grouped: { dateKey: string; date: Date; items: typeof cleaningSlots }[] = [];
                let cur: typeof grouped[0] | null = null;
                for (const slot of cleaningSlots) {
                  const dk = format(slot.date, "yyyy-MM-dd");
                  if (!cur || cur.dateKey !== dk) {
                    cur = { dateKey: dk, date: slot.date, items: [] };
                    grouped.push(cur);
                  }
                  cur.items.push(slot);
                }
                return grouped.map(group => (
                  <div key={group.dateKey}>
                    <div className={`flex items-center gap-3 mb-2 ${
                      isBefore(group.date, today) && !isSameDay(group.date, today) ? "opacity-50" : ""
                    }`}>
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-sm font-bold uppercase tracking-wider text-primary capitalize">
                        🧹 {format(group.date, "EEEE dd MMMM", { locale: fr })}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="space-y-2">
                      {group.items.map(slot => (
                        <Card
                          key={slot.outgoing.id}
                          className={`${
                            isBefore(slot.date, today) && !isSameDay(slot.date, today)
                              ? "opacity-50"
                              : isUrgent(slot.hoursAvailable)
                                ? "border-destructive/50 bg-destructive/5"
                                : isTight(slot.hoursAvailable)
                                  ? "border-warning/50 bg-warning/5"
                                  : ""
                          }`}
                        >
                          <CardContent className="py-3 px-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex-shrink-0 sm:w-[180px]">
                                <p className="font-semibold text-sm">{slot.listing.title}</p>
                                {isUrgent(slot.hoursAvailable) && (
                                  <Badge variant="destructive" className="mt-1 text-xs">⚠️ Même jour</Badge>
                                )}
                                {isTight(slot.hoursAvailable) && (
                                  <Badge variant="outline" className="mt-1 text-xs">⏰ Serré</Badge>
                                )}
                              </div>
                              <Separator orientation="vertical" className="hidden sm:block h-12" />
                              <div className="flex-1 grid sm:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">
                                    {slot.outgoing.status === 'owner_blocked' ? 'Fin blocage' : 'Départ'}
                                  </p>
                                  <p className="font-medium">{slot.outgoing.tenant_name}</p>
                                  {slot.outgoing.status !== 'owner_blocked' && slot.outgoing.tenant_phone && (
                                    <p className="text-muted-foreground text-xs">{slot.outgoing.tenant_phone}</p>
                                  )}
                                  {slot.outgoing.status !== 'owner_blocked' && (
                                    <p className="text-muted-foreground text-xs">
                                      {slot.outgoing.nights} nuit{slot.outgoing.nights > 1 ? "s" : ""}
                                      {(() => {
                                        const t = slot.outgoing.checkout_time?.slice(0, 5) || slot.listing.checkout_until?.slice(0, 5);
                                        return t ? ` — départ ${t}` : "";
                                      })()}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">
                                    {slot.incoming?.status === 'owner_blocked' ? 'Début blocage' : 'Arrivée suivante'}
                                  </p>
                                  {slot.incoming ? (
                                    <>
                                      <p className="font-medium">{slot.incoming.tenant_name}</p>
                                      {slot.incoming.status !== 'owner_blocked' && slot.incoming.tenant_phone && (
                                        <p className="text-muted-foreground text-xs">{slot.incoming.tenant_phone}</p>
                                      )}
                                      <p className="text-muted-foreground text-xs capitalize">
                                        {format(parseISO(slot.incoming.checkin_date), "EEEE dd/MM", { locale: fr })}
                                        {slot.incoming.status !== 'owner_blocked' && (() => {
                                          const t = slot.incoming.checkin_time?.slice(0, 5) || slot.listing.checkin_from?.slice(0, 5);
                                          return t ? ` — arrivée ${t}` : "";
                                        })()}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-muted-foreground text-xs italic">Pas d'arrivée prévue</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-6">
          Planning généré automatiquement • Mis à jour en temps réel
        </div>
      </div>
    </div>
  );
}

// ── Calendar component per listing ─────────────────────

function ListingCalendar({
  listing,
  currentMonth,
  monthStart,
  monthEnd,
  today,
  onSelectBooking,
  selectedBookingId,
}: {
  listing: PortalListing;
  currentMonth: Date;
  monthStart: Date;
  monthEnd: Date;
  today: Date;
  onSelectBooking: (b: PortalBooking) => void;
  selectedBookingId?: string;
}) {
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  type DayInfo = { booking: PortalBooking; isCheckin: boolean; isCheckout: boolean; isMid: boolean } | null;

  const getDayInfo = (day: Date): DayInfo => {
    for (const b of listing.bookings) {
      const checkin = parseISO(b.checkin_date);
      const checkout = parseISO(b.checkout_date);
      if (isSameDay(day, checkin)) return { booking: b, isCheckin: true, isCheckout: false, isMid: false };
      if (isSameDay(day, checkout)) return { booking: b, isCheckin: false, isCheckout: true, isMid: false };
      if (isBefore(checkin, day) && isBefore(day, checkout)) return { booking: b, isCheckin: false, isCheckout: false, isMid: true };
    }
    return null;
  };

  // Check if a day is both checkout of one booking AND checkin of another (turnaround)
  const getTurnaround = (day: Date): { outgoing: PortalBooking; incoming: PortalBooking } | null => {
    let outgoing: PortalBooking | null = null;
    let incoming: PortalBooking | null = null;
    for (const b of listing.bookings) {
      if (isSameDay(day, parseISO(b.checkout_date))) outgoing = b;
      if (isSameDay(day, parseISO(b.checkin_date))) incoming = b;
    }
    if (outgoing && incoming && outgoing.id !== incoming.id) return { outgoing, incoming };
    return null;
  };

  const weekDays = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{listing.title}</CardTitle>
        {listing.checkin_from && (
          <p className="text-xs text-muted-foreground">
            Arrivée dès {listing.checkin_from.slice(0, 5)} — Départ avant {listing.checkout_until?.slice(0, 5)}
          </p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[0.7rem] font-medium text-muted-foreground uppercase py-1.5">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map(day => {
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const turnaround = getTurnaround(day);
            const info = getDayInfo(day);
            const isPast = isBefore(day, today) && !isSameDay(day, today);

            // Determine status
            const isBlockedBooking = info?.booking.status === 'owner_blocked';
            const isTurnaroundBlocked = turnaround?.outgoing.status === 'owner_blocked' || turnaround?.incoming.status === 'owner_blocked';
            let status: "available" | "booked" | "blocked" | "checkin" | "checkout" | "turnaround" = "available";
            if (turnaround) {
              status = "turnaround";
            } else if (info?.isMid && isBlockedBooking) {
              status = "blocked";
            } else if (info?.isMid) {
              status = "booked";
            } else if (info?.isCheckin) {
              status = "checkin";
            } else if (info?.isCheckout) {
              status = "checkout";
            }

            const isHalf = status === "checkin" || status === "checkout" || status === "turnaround";
            const isSelected = info?.booking.id === selectedBookingId || turnaround?.outgoing.id === selectedBookingId || turnaround?.incoming.id === selectedBookingId;

            const handleClick = () => {
              if (turnaround) onSelectBooking(turnaround.incoming);
              else if (info) onSelectBooking(info.booking);
            };

            if (!inMonth) {
              return (
                <div key={day.toISOString()} className="flex items-center justify-center">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full text-sm opacity-20 text-muted-foreground">
                    {format(day, "d")}
                  </div>
                </div>
              );
            }

            if (isHalf) {
              return (
                <div key={day.toISOString()} className="flex items-center justify-center" onClick={handleClick}>
                  <div className={`relative flex items-center justify-center h-10 w-10 rounded-full text-sm font-medium cursor-pointer select-none mx-auto overflow-hidden ${isToday ? "ring-2 ring-primary" : ""} ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""} ${isPast ? "opacity-40" : ""}`}>
                    {/* Left half */}
                    <div className={`absolute inset-0 w-1/2 rounded-l-full ${
                      status === "checkout" || status === "turnaround"
                        ? "bg-primary/70"
                        : "bg-[hsl(var(--calendar-available,142_71%_45%)/0.25)]"
                    }`} />
                    {/* Right half */}
                    <div className={`absolute right-0 inset-y-0 w-1/2 rounded-r-full ${
                      status === "checkin" || status === "turnaround"
                        ? "bg-primary/70"
                        : "bg-[hsl(var(--calendar-available,142_71%_45%)/0.25)]"
                    }`} />
                    <span className="relative z-10 text-foreground">{format(day, "d")}</span>
                  </div>
                </div>
              );
            }

            const base = "h-10 w-10 flex items-center justify-center rounded-full text-sm transition-all cursor-default select-none mx-auto";
            let cls = base;
            if (status === "booked") {
              cls = `${base} bg-primary text-primary-foreground font-semibold cursor-pointer`;
            } else if (status === "blocked") {
              cls = `${base} bg-muted text-muted-foreground font-medium`;
            } else {
              cls = `${base} bg-[hsl(var(--calendar-available,142_71%_45%)/0.25)] text-foreground hover:bg-[hsl(var(--calendar-available,142_71%_45%)/0.4)]`;
            }
            if (isToday) cls += " ring-2 ring-primary font-bold";
            if (isSelected) cls += " ring-2 ring-primary ring-offset-1";
            if (isPast) cls += " opacity-40";

            return (
              <div key={day.toISOString()} className="flex items-center justify-center" onClick={handleClick}>
                <div className={cls}>
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--calendar-available,142_71%_45%)/0.3)]" />
            Disponible
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-primary" />
            Occupé
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-muted border" />
            Bloqué
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full overflow-hidden flex">
              <div className="w-1/2 bg-[hsl(var(--calendar-available,142_71%_45%)/0.3)]" />
              <div className="w-1/2 bg-primary/70" />
            </div>
            Arrivée
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full overflow-hidden flex">
              <div className="w-1/2 bg-primary/70" />
              <div className="w-1/2 bg-[hsl(var(--calendar-available,142_71%_45%)/0.3)]" />
            </div>
            Départ / Ménage
          </div>
        </div>

        {/* Booking details list */}
        {listing.bookings.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Réservations du mois</p>
            {[...listing.bookings]
              .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
              .map(b => {
                const isSelected = b.id === selectedBookingId;
                return (
                  <div
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{b.tenant_name}</span>
                      {b.tenant_phone && (
                        <a href={`tel:${b.tenant_phone}`} className="text-primary underline text-xs flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <Phone className="h-3 w-3" />
                          {b.tenant_phone}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                      <span className="capitalize">
                        {format(parseISO(b.checkin_date), "EEE dd/MM", { locale: fr })} → {format(parseISO(b.checkout_date), "EEE dd/MM", { locale: fr })}
                      </span>
                      <span>{b.nights} nuit{b.nights > 1 ? "s" : ""}</span>
                    </div>
                    {(listing.checkin_from || listing.checkout_until) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>
                          {listing.checkin_from ? `Arrivée ${listing.checkin_from.slice(0, 5)}` : ""}
                          {listing.checkin_from && listing.checkout_until ? " — " : ""}
                          {listing.checkout_until ? `Départ ${listing.checkout_until.slice(0, 5)}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
