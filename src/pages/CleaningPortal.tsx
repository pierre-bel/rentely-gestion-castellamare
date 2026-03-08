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
  eachDayOfInterval, getDay, isSameMonth,
} from "date-fns";
import { fr } from "date-fns/locale";

interface PortalBooking {
  id: string;
  checkin_date: string;
  checkout_date: string;
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
        {/* Month navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold capitalize w-[200px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

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
                  {selectedBooking.listing.checkin_from && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Arrivée dès {selectedBooking.listing.checkin_from?.slice(0, 5)} — Départ avant {selectedBooking.listing.checkout_until?.slice(0, 5)}</span>
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
                                  <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Départ</p>
                                  <p className="font-medium">{slot.outgoing.tenant_name}</p>
                                  {slot.outgoing.tenant_phone && (
                                    <p className="text-muted-foreground text-xs">{slot.outgoing.tenant_phone}</p>
                                  )}
                                  <p className="text-muted-foreground text-xs">
                                    {slot.outgoing.nights} nuit{slot.outgoing.nights > 1 ? "s" : ""}
                                    {slot.listing.checkout_until && ` — départ ${slot.listing.checkout_until.slice(0, 5)}`}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Arrivée suivante</p>
                                  {slot.incoming ? (
                                    <>
                                      <p className="font-medium">{slot.incoming.tenant_name}</p>
                                      {slot.incoming.tenant_phone && (
                                        <p className="text-muted-foreground text-xs">{slot.incoming.tenant_phone}</p>
                                      )}
                                      <p className="text-muted-foreground text-xs capitalize">
                                        {format(parseISO(slot.incoming.checkin_date), "EEEE dd/MM", { locale: fr })}
                                        {slot.listing.checkin_from && ` — arrivée ${slot.listing.checkin_from.slice(0, 5)}`}
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
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // Monday = 0

  const bookingForDay = (day: Date): { booking: PortalBooking; isCheckin: boolean; isCheckout: boolean; isMid: boolean } | null => {
    for (const b of listing.bookings) {
      const checkin = parseISO(b.checkin_date);
      const checkout = parseISO(b.checkout_date);
      if (isSameDay(day, checkin)) return { booking: b, isCheckin: true, isCheckout: false, isMid: false };
      if (isSameDay(day, checkout)) return { booking: b, isCheckin: false, isCheckout: true, isMid: false };
      if (isBefore(checkin, day) && isBefore(day, checkout)) return { booking: b, isCheckin: false, isCheckout: false, isMid: true };
    }
    return null;
  };

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{listing.title}</CardTitle>
        {listing.checkin_from && (
          <p className="text-xs text-muted-foreground">
            Arrivée dès {listing.checkin_from.slice(0, 5)} — Départ avant {listing.checkout_until?.slice(0, 5)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px">
          {/* Header */}
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {/* Empty cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10 sm:h-12" />
          ))}
          {/* Days */}
          {days.map(day => {
            const info = bookingForDay(day);
            const isPast = isBefore(day, today) && !isSameDay(day, today);
            const isToday = isSameDay(day, today);
            const isSelected = info?.booking.id === selectedBookingId;

            let bgClass = "bg-card hover:bg-accent/50";
            let textClass = "text-foreground";

            if (info) {
              if (info.isCheckout) {
                // Checkout day = cleaning day!
                bgClass = "bg-destructive/15 hover:bg-destructive/25 cursor-pointer";
                textClass = "text-destructive font-bold";
              } else if (info.isCheckin) {
                bgClass = "bg-primary/15 hover:bg-primary/25 cursor-pointer";
                textClass = "text-primary font-semibold";
              } else if (info.isMid) {
                bgClass = "bg-muted cursor-pointer";
                textClass = "text-muted-foreground";
              }
            }

            if (isSelected) {
              bgClass += " ring-2 ring-primary ring-offset-1";
            }

            if (isPast) {
              textClass += " opacity-40";
            }

            return (
              <div
                key={day.toISOString()}
                className={`h-10 sm:h-12 flex flex-col items-center justify-center rounded-md text-sm transition-colors relative ${bgClass} ${isToday ? "ring-1 ring-primary/50" : ""}`}
                onClick={() => info && onSelectBooking(info.booking)}
              >
                <span className={textClass}>{format(day, "d")}</span>
                {info?.isCheckout && (
                  <SprayCan className="h-3 w-3 text-destructive absolute bottom-0.5" />
                )}
                {info?.isCheckin && (
                  <span className="text-[9px] text-primary absolute bottom-0.5">▶</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted border" />
            <span>Occupé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/15 border border-primary/30" />
            <span>Arrivée</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-destructive/15 border border-destructive/30" />
            <span>Départ / Ménage</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
