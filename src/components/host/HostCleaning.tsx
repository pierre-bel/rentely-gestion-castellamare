import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, SprayCan, Calendar, Moon, Phone, User, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInCalendarDays, isWithinInterval, isBefore, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  listing_id: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  notes: string | null;
  pricing_breakdown: any;
  status: string;
}

interface Listing {
  id: string;
  title: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
}

interface CleaningSlot {
  cleaningDate: Date;
  checkoutBooking: Booking;
  nextCheckinBooking: Booking | null;
  tenant: Tenant | null;
  nextTenant: Tenant | null;
  listingTitle: string;
  hoursAvailable: number | null; // hours between checkout and next checkin (null = no next booking)
}

export function HostCleaning() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedListingId, setSelectedListingId] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch listings
  const { data: listings = [] } = useQuery({
    queryKey: ["host-listings-cleaning", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("id, title")
        .eq("host_user_id", user.id)
        .order("title");
      if (error) throw error;
      return data as Listing[];
    },
    enabled: !!user?.id,
  });

  // Fetch bookings for a wide range around currentMonth
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: bookings = [] } = useQuery({
    queryKey: ["host-cleaning-bookings", user?.id, format(monthStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user?.id) return [];
      // Fetch bookings that overlap the month (checkout in this month means cleaning needed)
      const rangeStart = format(subMonths(monthStart, 1), "yyyy-MM-dd");
      const rangeEnd = format(addMonths(monthEnd, 1), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("bookings")
        .select("id, listing_id, checkin_date, checkout_date, nights, notes, pricing_breakdown, status")
        .in("status", ["confirmed", "completed"])
        .gte("checkout_date", rangeStart)
        .lte("checkin_date", rangeEnd)
        .order("checkin_date");
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user?.id,
  });

  // Fetch tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ["host-tenants-cleaning", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("tenants")
        .select("id, first_name, last_name, phone")
        .eq("host_user_id", user.id);
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: !!user?.id,
  });

  const tenantMap = useMemo(() => {
    const map = new Map<string, Tenant>();
    for (const t of tenants) map.set(t.id, t);
    return map;
  }, [tenants]);

  const getTenant = (booking: Booking): Tenant | null => {
    const pb = booking.pricing_breakdown as any;
    if (pb?.tenant_id) return tenantMap.get(pb.tenant_id) || null;
    return null;
  };

  // Build cleaning slots: each checkout that falls in the selected month = one cleaning
  const cleaningSlots = useMemo(() => {
    const filteredBookings = selectedListingId === "all"
      ? bookings
      : bookings.filter(b => b.listing_id === selectedListingId);

    // Group by listing
    const byListing = new Map<string, Booking[]>();
    for (const b of filteredBookings) {
      const arr = byListing.get(b.listing_id) || [];
      arr.push(b);
      byListing.set(b.listing_id, arr);
    }

    const slots: CleaningSlot[] = [];

    for (const [listingId, listingBookings] of byListing) {
      const sorted = [...listingBookings].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
      const listing = listings.find(l => l.id === listingId);

      for (let i = 0; i < sorted.length; i++) {
        const booking = sorted[i];
        const checkoutDate = parseISO(booking.checkout_date);

        // Only show cleanings where checkout is in the selected month
        if (!isWithinInterval(checkoutDate, { start: monthStart, end: monthEnd })) continue;

        const nextBooking = sorted[i + 1] || null;
        const hoursAvailable = nextBooking
          ? differenceInCalendarDays(parseISO(nextBooking.checkin_date), checkoutDate) * 24
          : null;

        slots.push({
          cleaningDate: checkoutDate,
          checkoutBooking: booking,
          nextCheckinBooking: nextBooking,
          tenant: getTenant(booking),
          nextTenant: nextBooking ? getTenant(nextBooking) : null,
          listingTitle: listing?.title || "Bien inconnu",
          hoursAvailable,
        });
      }
    }

    return slots.sort((a, b) => a.cleaningDate.getTime() - b.cleaningDate.getTime());
  }, [bookings, selectedListingId, listings, monthStart, monthEnd, tenantMap]);

  // Generate copyable message
  const generateMessage = () => {
    if (cleaningSlots.length === 0) return "";

    const monthLabel = format(currentMonth, "MMMM yyyy", { locale: fr });
    let msg = `🧹 PLANNING MÉNAGE — ${monthLabel.toUpperCase()}\n`;
    msg += "═".repeat(40) + "\n\n";

    for (const slot of cleaningSlots) {
      const checkoutDay = format(slot.cleaningDate, "EEEE dd MMMM", { locale: fr });
      const urgencyLabel = slot.hoursAvailable !== null && slot.hoursAvailable <= 24
        ? " ⚠️ URGENT"
        : slot.hoursAvailable !== null && slot.hoursAvailable <= 48
          ? " ⏰"
          : "";

      msg += `🏠 ${slot.listingTitle}\n`;
      msg += `📅 Ménage le : ${checkoutDay}${urgencyLabel}\n`;

      // Outgoing tenant
      const tenantName = slot.tenant
        ? `${slot.tenant.first_name} ${slot.tenant.last_name || ""}`.trim()
        : extractTenantFromNotes(slot.checkoutBooking.notes);
      msg += `👤 Départ : ${tenantName || "Non renseigné"}`;
      if (slot.tenant?.phone) msg += ` — 📞 ${slot.tenant.phone}`;
      msg += "\n";

      msg += `   Séjour : ${format(parseISO(slot.checkoutBooking.checkin_date), "dd/MM")} → ${format(parseISO(slot.checkoutBooking.checkout_date), "dd/MM")} (${slot.checkoutBooking.nights} nuit${slot.checkoutBooking.nights > 1 ? "s" : ""})\n`;

      // Next tenant
      if (slot.nextCheckinBooking) {
        const nextName = slot.nextTenant
          ? `${slot.nextTenant.first_name} ${slot.nextTenant.last_name || ""}`.trim()
          : extractTenantFromNotes(slot.nextCheckinBooking.notes);
        const nextCheckin = format(parseISO(slot.nextCheckinBooking.checkin_date), "EEEE dd MMMM", { locale: fr });
        msg += `👤 Arrivée suivante : ${nextName || "Non renseigné"} — ${nextCheckin}`;
        if (slot.nextTenant?.phone) msg += ` — 📞 ${slot.nextTenant.phone}`;
        msg += "\n";

        if (slot.hoursAvailable !== null) {
          const days = Math.floor(slot.hoursAvailable / 24);
          msg += `⏱️ Temps disponible : ${days} jour${days > 1 ? "s" : ""}\n`;
        }
      } else {
        msg += `👤 Pas de réservation suivante\n`;
      }

      msg += "\n";
    }

    return msg.trim();
  };

  const handleCopy = () => {
    const msg = generateMessage();
    if (!msg) {
      toast({ title: "Aucun ménage", description: "Aucun ménage prévu pour ce mois." });
      return;
    }
    navigator.clipboard.writeText(msg);
    toast({ title: "Copié !", description: "Le planning a été copié dans le presse-papiers." });
  };

  const isUrgent = (slot: CleaningSlot) => slot.hoursAvailable !== null && slot.hoursAvailable <= 24;
  const isTight = (slot: CleaningSlot) => slot.hoursAvailable !== null && slot.hoursAvailable <= 48 && !isUrgent(slot);
  const isPast = (slot: CleaningSlot) => isBefore(slot.cleaningDate, new Date()) && format(slot.cleaningDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd");

  return (
    <div className="container mx-auto px-4 py-6 lg:px-8 space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Select value={selectedListingId} onValueChange={setSelectedListingId}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Tous les biens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les biens</SelectItem>
            {listings.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-[140px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={handleCopy} className="ml-auto" variant="outline">
          <Copy className="h-4 w-4 mr-2" />
          Copier le planning
        </Button>
      </div>

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="secondary" className="gap-1">
          <SprayCan className="h-3 w-3" />
          {cleaningSlots.length} ménage{cleaningSlots.length !== 1 ? "s" : ""}
        </Badge>
        {cleaningSlots.filter(isUrgent).length > 0 && (
          <Badge variant="destructive" className="gap-1">
            ⚠️ {cleaningSlots.filter(isUrgent).length} urgent{cleaningSlots.filter(isUrgent).length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Cleaning cards */}
      {cleaningSlots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <SprayCan className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucun ménage prévu pour ce mois.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cleaningSlots.map((slot, idx) => {
            const tenantName = slot.tenant
              ? `${slot.tenant.first_name} ${slot.tenant.last_name || ""}`.trim()
              : extractTenantFromNotes(slot.checkoutBooking.notes);
            const nextTenantName = slot.nextTenant
              ? `${slot.nextTenant.first_name} ${slot.nextTenant.last_name || ""}`.trim()
              : slot.nextCheckinBooking ? extractTenantFromNotes(slot.nextCheckinBooking.notes) : null;

            return (
              <Card
                key={slot.checkoutBooking.id + "-" + idx}
                className={`transition-colors ${
                  isPast(slot)
                    ? "opacity-50"
                    : isUrgent(slot)
                      ? "border-destructive/50 bg-destructive/5"
                      : isTight(slot)
                        ? "border-accent/80 bg-accent/10"
                        : ""
                }`}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Date & listing */}
                    <div className="flex-shrink-0 lg:w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <SprayCan className="h-4 w-4 text-primary" />
                        <span className="font-semibold capitalize">
                          {format(slot.cleaningDate, "EEEE dd MMM", { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{slot.listingTitle}</p>
                      {isUrgent(slot) && (
                        <Badge variant="destructive" className="mt-1 text-xs">⚠️ Enchaînement immédiat</Badge>
                      )}
                      {isTight(slot) && (
                        <Badge variant="outline" className="mt-1 text-xs">⏰ Enchaînement serré</Badge>
                      )}
                    </div>

                    <Separator orientation="vertical" className="hidden lg:block h-auto self-stretch" />

                    {/* Outgoing */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Départ</p>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{tenantName || "Non renseigné"}</span>
                      </div>
                      {slot.tenant?.phone && (
                        <div className="flex items-center gap-2 text-sm mt-0.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span>{slot.tenant.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{format(parseISO(slot.checkoutBooking.checkin_date), "dd/MM")} → {format(parseISO(slot.checkoutBooking.checkout_date), "dd/MM")}</span>
                        <Moon className="h-3.5 w-3.5 flex-shrink-0 ml-1" />
                        <span>{slot.checkoutBooking.nights} nuit{slot.checkoutBooking.nights > 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <Separator orientation="vertical" className="hidden lg:block h-auto self-stretch" />

                    {/* Incoming */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Arrivée suivante</p>
                      {slot.nextCheckinBooking ? (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">{nextTenantName || "Non renseigné"}</span>
                          </div>
                          {slot.nextTenant?.phone && (
                            <div className="flex items-center gap-2 text-sm mt-0.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span>{slot.nextTenant.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="capitalize">{format(parseISO(slot.nextCheckinBooking.checkin_date), "EEEE dd/MM", { locale: fr })}</span>
                          </div>
                          {slot.hoursAvailable !== null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ⏱️ {Math.floor(slot.hoursAvailable / 24)} jour{Math.floor(slot.hoursAvailable / 24) > 1 ? "s" : ""} entre les deux
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Pas de réservation suivante</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Extract tenant name from booking notes (format: "Locataire: Prénom Nom | ...") */
function extractTenantFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Locataire:\s*([^|]+)/);
  return match ? match[1].trim() : null;
}
