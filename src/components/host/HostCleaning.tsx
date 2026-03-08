import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Copy, SprayCan, Calendar, Moon, Phone, User, ChevronLeft, ChevronRight,
  Plus, Trash2, Settings2, UserCheck, ExternalLink, Link2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInCalendarDays, isWithinInterval, isBefore, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────

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

interface Listing { id: string; title: string; }
interface Tenant { id: string; first_name: string; last_name: string | null; phone: string | null; }
interface CleaningStaff { id: string; name: string; phone: string | null; }
interface StaffAssignment { id: string; cleaning_staff_id: string; listing_id: string; }

interface CleaningSlot {
  cleaningDate: Date;
  checkoutBooking: Booking;
  nextCheckinBooking: Booking | null;
  tenant: Tenant | null;
  nextTenant: Tenant | null;
  listingId: string;
  listingTitle: string;
  hoursAvailable: number | null;
  staffMember: CleaningStaff | null;
}

// ── Component ────────────────────────────────────────

export function HostCleaning() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedListingId, setSelectedListingId] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);

  // ── Data fetching ──────────────────────────────────

  const { data: listings = [] } = useQuery({
    queryKey: ["host-listings-cleaning", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("listings").select("id, title").eq("host_user_id", user.id).order("title");
      if (error) throw error;
      return data as Listing[];
    },
    enabled: !!user?.id,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: bookings = [] } = useQuery({
    queryKey: ["host-cleaning-bookings", user?.id, format(monthStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user?.id) return [];
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

  const { data: tenants = [] } = useQuery({
    queryKey: ["host-tenants-cleaning", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("tenants").select("id, first_name, last_name, phone").eq("host_user_id", user.id);
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: !!user?.id,
  });

  const { data: cleaningStaff = [] } = useQuery({
    queryKey: ["cleaning-staff", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("cleaning_staff").select("id, name, phone").eq("host_user_id", user.id).order("name");
      if (error) throw error;
      return data as CleaningStaff[];
    },
    enabled: !!user?.id,
  });

  const { data: staffAssignments = [] } = useQuery({
    queryKey: ["cleaning-staff-listings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("cleaning_staff_listings").select("id, cleaning_staff_id, listing_id").eq("host_user_id", user.id);
      if (error) throw error;
      return data as StaffAssignment[];
    },
    enabled: !!user?.id,
  });

  // ── Lookups ────────────────────────────────────────

  const tenantMap = useMemo(() => {
    const map = new Map<string, Tenant>();
    for (const t of tenants) map.set(t.id, t);
    return map;
  }, [tenants]);

  const staffByListing = useMemo(() => {
    const map = new Map<string, CleaningStaff>();
    for (const a of staffAssignments) {
      const staff = cleaningStaff.find(s => s.id === a.cleaning_staff_id);
      if (staff) map.set(a.listing_id, staff);
    }
    return map;
  }, [staffAssignments, cleaningStaff]);

  const getTenant = (booking: Booking): Tenant | null => {
    const pb = booking.pricing_breakdown as any;
    if (pb?.tenant_id) return tenantMap.get(pb.tenant_id) || null;
    return null;
  };

  // ── Cleaning slots ────────────────────────────────

  const cleaningSlots = useMemo(() => {
    const filteredBookings = selectedListingId === "all"
      ? bookings
      : bookings.filter(b => b.listing_id === selectedListingId);

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
          listingId,
          listingTitle: listing?.title || "Bien inconnu",
          hoursAvailable,
          staffMember: staffByListing.get(listingId) || null,
        });
      }
    }

    return slots.sort((a, b) => a.cleaningDate.getTime() - b.cleaningDate.getTime());
  }, [bookings, selectedListingId, listings, monthStart, monthEnd, tenantMap, staffByListing]);

  // ── Message generation ─────────────────────────────

  const buildSlotText = (slot: CleaningSlot) => {
    const checkoutDay = format(slot.cleaningDate, "EEEE dd MMMM", { locale: fr });
    const urgencyLabel = slot.hoursAvailable !== null && slot.hoursAvailable <= 24
      ? " ⚠️ URGENT" : slot.hoursAvailable !== null && slot.hoursAvailable <= 48 ? " ⏰" : "";

    let msg = `🏠 ${slot.listingTitle}\n`;
    msg += `📅 Ménage le : ${checkoutDay}${urgencyLabel}\n`;

    const tenantName = slot.tenant
      ? `${slot.tenant.first_name} ${slot.tenant.last_name || ""}`.trim()
      : extractTenantFromNotes(slot.checkoutBooking.notes);
    msg += `👤 Départ : ${tenantName || "Non renseigné"}`;
    if (slot.tenant?.phone) msg += ` — 📞 ${slot.tenant.phone}`;
    msg += "\n";
    msg += `   Séjour : ${format(parseISO(slot.checkoutBooking.checkin_date), "dd/MM")} → ${format(parseISO(slot.checkoutBooking.checkout_date), "dd/MM")} (${slot.checkoutBooking.nights} nuit${slot.checkoutBooking.nights > 1 ? "s" : ""})\n`;

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
    return msg;
  };

  const generateFullMessage = () => {
    if (cleaningSlots.length === 0) return "";
    const monthLabel = format(currentMonth, "MMMM yyyy", { locale: fr });
    let msg = `🧹 PLANNING MÉNAGE — ${monthLabel.toUpperCase()}\n` + "═".repeat(40) + "\n\n";
    for (const slot of cleaningSlots) msg += buildSlotText(slot) + "\n";
    return msg.trim();
  };

  const generatePerStaffMessage = (staff: CleaningStaff) => {
    const staffSlots = cleaningSlots
      .filter(s => s.staffMember?.id === staff.id)
      .sort((a, b) => a.cleaningDate.getTime() - b.cleaningDate.getTime());
    if (staffSlots.length === 0) return "";
    const monthLabel = format(currentMonth, "MMMM yyyy", { locale: fr });
    let msg = `🧹 PLANNING MÉNAGE — ${staff.name.toUpperCase()}\n`;
    msg += `📆 ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}\n`;
    msg += "═".repeat(40) + "\n\n";

    // Group by date for clarity
    let lastDateKey = "";
    for (const slot of staffSlots) {
      const dateKey = format(slot.cleaningDate, "yyyy-MM-dd");
      if (dateKey !== lastDateKey) {
        if (lastDateKey) msg += "─".repeat(30) + "\n\n";
        const dayLabel = format(slot.cleaningDate, "📅 EEEE dd MMMM", { locale: fr }).toUpperCase();
        msg += `${dayLabel}\n\n`;
        lastDateKey = dateKey;
      }
      msg += buildSlotTextCompact(slot) + "\n";
    }
    return msg.trim();
  };

  const buildSlotTextCompact = (slot: CleaningSlot) => {
    const urgencyLabel = slot.hoursAvailable !== null && slot.hoursAvailable <= 24
      ? " ⚠️ URGENT" : slot.hoursAvailable !== null && slot.hoursAvailable <= 48 ? " ⏰" : "";

    let msg = `🏠 ${slot.listingTitle}${urgencyLabel}\n`;

    const tenantName = slot.tenant
      ? `${slot.tenant.first_name} ${slot.tenant.last_name || ""}`.trim()
      : extractTenantFromNotes(slot.checkoutBooking.notes);
    msg += `   ↗ Départ : ${tenantName || "Non renseigné"}`;
    if (slot.tenant?.phone) msg += ` — 📞 ${slot.tenant.phone}`;
    msg += ` (${slot.checkoutBooking.nights} nuit${slot.checkoutBooking.nights > 1 ? "s" : ""})\n`;

    if (slot.nextCheckinBooking) {
      const nextName = slot.nextTenant
        ? `${slot.nextTenant.first_name} ${slot.nextTenant.last_name || ""}`.trim()
        : extractTenantFromNotes(slot.nextCheckinBooking.notes);
      const nextCheckin = format(parseISO(slot.nextCheckinBooking.checkin_date), "EEEE dd/MM", { locale: fr });
      msg += `   ↘ Arrivée : ${nextName || "Non renseigné"} — ${nextCheckin}`;
      if (slot.nextTenant?.phone) msg += ` — 📞 ${slot.nextTenant.phone}`;
      msg += "\n";
      if (slot.hoursAvailable !== null) {
        const days = Math.floor(slot.hoursAvailable / 24);
        msg += `   ⏱️ ${days === 0 ? "Même jour !" : `${days} jour${days > 1 ? "s" : ""} avant arrivée`}\n`;
      }
    } else {
      msg += `   ✅ Pas d'arrivée prévue ensuite\n`;
    }
    return msg;
  };

  const handleCopyAll = () => {
    const msg = generateFullMessage();
    if (!msg) { toast({ title: "Aucun ménage", description: "Aucun ménage prévu pour ce mois." }); return; }
    navigator.clipboard.writeText(msg);
    toast({ title: "Copié !", description: "Le planning complet a été copié." });
  };

  const handleCopyForStaff = (staff: CleaningStaff) => {
    const msg = generatePerStaffMessage(staff);
    if (!msg) { toast({ title: "Aucun ménage", description: `Aucun ménage prévu pour ${staff.name} ce mois.` }); return; }
    navigator.clipboard.writeText(msg);
    toast({ title: "Copié !", description: `Planning de ${staff.name} copié.` });
  };

  const isUrgent = (slot: CleaningSlot) => slot.hoursAvailable !== null && slot.hoursAvailable <= 24;
  const isTight = (slot: CleaningSlot) => slot.hoursAvailable !== null && slot.hoursAvailable <= 48 && !isUrgent(slot);
  const isPast = (slot: CleaningSlot) => isBefore(slot.cleaningDate, new Date()) && format(slot.cleaningDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd");

  // Count per staff
  const staffCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of cleaningSlots) {
      if (s.staffMember) counts.set(s.staffMember.id, (counts.get(s.staffMember.id) || 0) + 1);
    }
    return counts;
  }, [cleaningSlots]);

  return (
    <div className="container mx-auto px-4 py-6 lg:px-8 space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
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

        <div className="flex items-center gap-2 ml-auto">
          <Button onClick={() => setStaffDialogOpen(true)} variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-2" />
            Équipe ménage
          </Button>
          <Button onClick={handleCopyAll} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Copier tout
          </Button>
        </div>
      </div>

      {/* Staff copy buttons */}
      {cleaningStaff.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {cleaningStaff.map(staff => {
            const count = staffCounts.get(staff.id) || 0;
            return (
              <Button
                key={staff.id}
                variant="secondary"
                size="sm"
                onClick={() => handleCopyForStaff(staff)}
                className="gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                {staff.name}
                {count > 0 && <Badge variant="outline" className="ml-1 text-xs px-1.5">{count}</Badge>}
              </Button>
            );
          })}
        </div>
      )}

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

      {/* Cleaning cards grouped by date */}
      {cleaningSlots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <SprayCan className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucun ménage prévu pour ce mois.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(() => {
            const grouped: { dateKey: string; date: Date; slots: typeof cleaningSlots }[] = [];
            let current: typeof grouped[0] | null = null;
            for (const slot of cleaningSlots) {
              const dk = format(slot.cleaningDate, "yyyy-MM-dd");
              if (!current || current.dateKey !== dk) {
                current = { dateKey: dk, date: slot.cleaningDate, slots: [] };
                grouped.push(current);
              }
              current.slots.push(slot);
            }
            return grouped.map(group => (
              <div key={group.dateKey}>
                <div className={`flex items-center gap-3 mb-3 ${
                  isBefore(group.date, new Date()) && format(group.date, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd")
                    ? "opacity-50" : ""
                }`}>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-sm font-bold uppercase tracking-wider text-primary capitalize">
                    {format(group.date, "EEEE dd MMMM", { locale: fr })}
                  </span>
                  <Badge variant="outline" className="text-xs">{group.slots.length} ménage{group.slots.length > 1 ? "s" : ""}</Badge>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
          {group.slots.map((slot, idx) => {
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
                    {/* Listing & staff */}
                    <div className="flex-shrink-0 lg:w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <SprayCan className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{slot.listingTitle}</span>
                      </div>
                      {slot.staffMember && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <UserCheck className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium">{slot.staffMember.name}</span>
                        </div>
                      )}
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
              </div>
            ));
          })()}
        </div>
      )}

      {/* Staff management dialog */}
      <CleaningStaffDialog
        open={staffDialogOpen}
        onOpenChange={setStaffDialogOpen}
        staff={cleaningStaff}
        assignments={staffAssignments}
        listings={listings}
      />
    </div>
  );
}

// ── Staff management dialog ──────────────────────────

function CleaningStaffDialog({
  open, onOpenChange, staff, assignments, listings,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staff: CleaningStaff[];
  assignments: StaffAssignment[];
  listings: Listing[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cleaning-staff"] });
    queryClient.invalidateQueries({ queryKey: ["cleaning-staff-listings"] });
  };

  const handleAddStaff = async () => {
    if (!user?.id || !newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("cleaning_staff").insert({
      host_user_id: user.id,
      name: newName.trim(),
      phone: newPhone.trim() || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setNewName("");
    setNewPhone("");
    invalidate();
  };

  const handleDeleteStaff = async (id: string) => {
    const { error } = await supabase.from("cleaning_staff").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    invalidate();
  };

  const handleToggleAssignment = async (staffId: string, listingId: string) => {
    if (!user?.id) return;
    const existing = assignments.find(a => a.cleaning_staff_id === staffId && a.listing_id === listingId);
    if (existing) {
      // Also remove any other staff assigned to this listing
      await supabase.from("cleaning_staff_listings").delete().eq("id", existing.id);
    } else {
      // Remove existing assignment for this listing (one cleaner per listing)
      const otherAssignment = assignments.find(a => a.listing_id === listingId);
      if (otherAssignment) {
        await supabase.from("cleaning_staff_listings").delete().eq("id", otherAssignment.id);
      }
      await supabase.from("cleaning_staff_listings").insert({
        cleaning_staff_id: staffId,
        listing_id: listingId,
        host_user_id: user.id,
      });
    }
    invalidate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Équipe de ménage</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new staff */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Ajouter une personne</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nom"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Téléphone"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                className="w-[140px]"
              />
              <Button onClick={handleAddStaff} disabled={!newName.trim() || saving} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Staff list with listing assignments */}
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune personne ajoutée.</p>
          ) : (
            <div className="space-y-5">
              {staff.map(s => (
                <div key={s.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{s.name}</span>
                      {s.phone && <span className="text-xs text-muted-foreground ml-2">{s.phone}</span>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteStaff(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="pl-2 space-y-1.5">
                    {listings.map(l => {
                      const isAssigned = assignments.some(a => a.cleaning_staff_id === s.id && a.listing_id === l.id);
                      return (
                        <label key={l.id} className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox
                            checked={isAssigned}
                            onCheckedChange={() => handleToggleAssignment(s.id, l.id)}
                          />
                          {l.title}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Extract tenant name from booking notes (format: "Locataire: Prénom Nom | ...") */
function extractTenantFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Locataire:\s*([^|]+)/);
  return match ? match[1].trim() : null;
}
