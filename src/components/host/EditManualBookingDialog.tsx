import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "./HostTenants";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { isBeachCabinPeriod } from "@/lib/beachCabinUtils";

interface BookingToEdit {
  id: string;
  listing_id: string;
  listing_title: string;
  checkin_date: string;
  checkout_date: string;
  checkin_time: string | null;
  checkout_time: string | null;
  nights: number;
  guests: number;
  total_price: number;
  cleaning_fee: number | null;
  notes: string | null;
  status: string;
  pricing_breakdown: any;
  beach_cabin?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingToEdit | null;
}

interface ScheduleItem {
  id?: string;
  label: string;
  amount: number;
  due_date: string;
  is_paid?: boolean;
}

export function EditManualBookingDialog({ open, onOpenChange, booking }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [checkinDate, setCheckinDate] = useState<Date>();
  const [checkoutDate, setCheckoutDate] = useState<Date>();
  const [rentalPrice, setRentalPrice] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [beachCabin, setBeachCabin] = useState(false);
  const [checkinTime, setCheckinTime] = useState("");
  const [checkoutTime, setCheckoutTime] = useState("");
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  // Fetch tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ["host-tenants", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("host_user_id", user.id)
        .order("first_name");
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: !!user?.id && open,
  });

  // Fetch existing payment items for this booking
  const { data: existingPaymentItems = [] } = useQuery({
    queryKey: ["booking-payment-items-edit", booking?.id],
    queryFn: async () => {
      if (!booking?.id) return [];
      const { data, error } = await supabase
        .from("booking_payment_items")
        .select("id, label, amount, due_date, is_paid, sort_order")
        .eq("booking_id", booking.id)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!booking?.id && open,
  });

  // Fetch beach cabin period settings
  const { data: portalSettings } = useQuery({
    queryKey: ["portal-settings-beach", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("portal_settings")
        .select("beach_cabin_start_month, beach_cabin_start_day, beach_cabin_end_month, beach_cabin_end_day")
        .eq("host_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Populate form when booking changes
  useEffect(() => {
    if (booking && open) {
      setCheckinDate(parseISO(booking.checkin_date));
      setCheckoutDate(parseISO(booking.checkout_date));
      const cf = booking.cleaning_fee || 0;
      setCleaningFee(String(cf));
      const rental = booking.total_price - cf;
      setRentalPrice(String(rental));
      
      // Pre-select tenant
      const bd = booking.pricing_breakdown;
      if (bd?.tenant_id && tenants.length > 0) {
        const found = tenants.find(t => t.id === bd.tenant_id);
        if (found) setSelectedTenantId(found.id);
      } else {
        const rawNotes = booking.notes || "";
        const tenantMatch = rawNotes.match(/Locataire:\s*([^|]+)/);
        if (tenantMatch && tenants.length > 0) {
          const name = tenantMatch[1].trim();
          const found = tenants.find(t => `${t.first_name} ${t.last_name || ""}`.trim() === name);
          if (found) setSelectedTenantId(found.id);
        }
      }
      
      // Extract notes (remove tenant + deposit info lines)
      const rawNotes = booking.notes || "";
      const parts = rawNotes.split(" | ").filter((p: string) => !p.startsWith("Locataire:") && !p.startsWith("Acompte:"));
      setNotes(parts.join(" | "));
      setBeachCabin(booking.beach_cabin || false);
      setCheckinTime(booking.checkin_time?.slice(0, 5) || "");
      setCheckoutTime(booking.checkout_time?.slice(0, 5) || "");
    }
  }, [booking, open, tenants]);

  // Load existing payment items into schedule
  useEffect(() => {
    if (existingPaymentItems.length > 0 && booking && open) {
      setScheduleItems(existingPaymentItems.map(pi => ({
        id: pi.id,
        label: pi.label,
        amount: Number(pi.amount),
        due_date: pi.due_date || "",
        is_paid: pi.is_paid,
      })));
    }
  }, [existingPaymentItems, booking, open]);

  const nights = checkinDate && checkoutDate
    ? differenceInCalendarDays(checkoutDate, checkinDate)
    : 0;

  const rentalNum = parseFloat(rentalPrice) || 0;
  const cleaningNum = parseFloat(cleaningFee) || 0;
  const totalNum = rentalNum + cleaningNum;

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: any) => {
    setScheduleItems(prev => {
      const updated = prev.map((item, i) => i === index ? { ...item, [field]: value } : item);
      // Auto-adjust last item when any other amount changes
      if (field === "amount" && updated.length > 1 && index < updated.length - 1) {
        const sumOthers = updated.slice(0, -1).reduce((s, i) => s + i.amount, 0);
        updated[updated.length - 1] = { ...updated[updated.length - 1], amount: Math.max(0, totalNum - sumOthers) };
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user || !booking || !checkinDate || !checkoutDate || nights <= 0) return;
    setSaving(true);

    try {
      const tenant = tenants.find((t) => t.id === selectedTenantId);

      const { error } = await supabase.from("bookings").update({
        checkin_date: format(checkinDate, "yyyy-MM-dd"),
        checkout_date: format(checkoutDate, "yyyy-MM-dd"),
        checkin_time: checkinTime || null,
        checkout_time: checkoutTime || null,
        nights,
        guests: 1,
        subtotal: rentalNum,
        cleaning_fee: cleaningNum,
        total_price: totalNum,
        host_payout_gross: totalNum,
        host_payout_net: totalNum,
        beach_cabin: beachCabin,
        pricing_breakdown: {
          rental_price: rentalNum,
          tenant_id: selectedTenantId || undefined,
        },
        notes: [
          tenant ? `Locataire: ${tenant.first_name} ${tenant.last_name || ""}`.trim() : null,
          notes.trim() || null,
        ].filter(Boolean).join(" | ") || null,
      }).eq("id", booking.id);

      if (error) throw error;

      // Update payment items: delete old ones and insert new ones
      // First delete existing items
      const { error: deleteErr } = await supabase
        .from("booking_payment_items")
        .delete()
        .eq("booking_id", booking.id);
      if (deleteErr) throw deleteErr;

      // Insert updated items
      if (scheduleItems.length > 0) {
        const paymentItems = scheduleItems
          .filter(s => s.label.trim() && s.amount > 0)
          .map((s, i) => ({
            booking_id: booking.id,
            label: s.label,
            amount: s.amount,
            due_date: s.due_date || null,
            sort_order: i,
            is_paid: s.is_paid || false,
            paid_at: s.is_paid ? (existingPaymentItems.find(ep => ep.id === s.id)?.is_paid ? undefined : new Date().toISOString()) : null,
          }));

        if (paymentItems.length > 0) {
          const { error: pErr } = await supabase.from("booking_payment_items").insert(paymentItems);
          if (pErr) throw pErr;
        }
      }

      toast({ title: "Réservation modifiée", description: "Les modifications ont été enregistrées." });
      queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["host-calendar-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["host-payments-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-payment-items-edit"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la réservation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Bien</Label>
            <Input value={booking.listing_title} readOnly className="bg-muted" />
          </div>

          {/* Tenant */}
          <div>
            <Label>Locataire</Label>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un locataire..." />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.first_name} {t.last_name || ""} {t.email ? `(${t.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Arrivée *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !checkinDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkinDate ? format(checkinDate, "dd/MM/yyyy") : "Choisir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkinDate}
                    onSelect={setCheckinDate}
                    locale={fr}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Départ *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !checkoutDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkoutDate ? format(checkoutDate, "dd/MM/yyyy") : "Choisir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkoutDate}
                    onSelect={setCheckoutDate}
                    disabled={(date) => checkinDate ? date <= checkinDate : false}
                    locale={fr}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

            {nights > 0 && <p className="text-sm text-muted-foreground">{nights} nuit(s)</p>}

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Heure d'arrivée</Label>
                <Input type="time" value={checkinTime} onChange={(e) => setCheckinTime(e.target.value)} />
              </div>
              <div>
                <Label>Heure de départ</Label>
                <Input type="time" value={checkoutTime} onChange={(e) => setCheckoutTime(e.target.value)} />
              </div>
            </div>

            <Separator />
          <p className="text-sm font-medium">Tarification</p>

          <div>
            <Label>Prix de location (€)</Label>
            <Input type="number" min="0" step="0.01" value={rentalPrice} onChange={(e) => setRentalPrice(e.target.value)} />
          </div>

          <div>
            <Label>Frais de ménage (€)</Label>
            <Input type="number" min="0" step="0.01" value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} />
          </div>

          <div>
            <Label>Prix total (€)</Label>
            <Input type="number" value={totalNum.toFixed(2)} readOnly className="bg-muted" />
          </div>

          {/* Payment schedule */}
          <Separator />
          <p className="text-sm font-medium">Échéances de paiement</p>

          {scheduleItems.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aucune échéance de paiement définie.
            </p>
          )}

          {scheduleItems.map((item, idx) => {
            const isLast = idx === scheduleItems.length - 1 && scheduleItems.length > 1;
            return (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Libellé</Label>
                  <Input value={item.label} readOnly className="bg-muted" />
                </div>
                <div className="w-24">
                  <Label className="text-xs">Montant</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount || ""}
                    readOnly={isLast}
                    className={isLast ? "bg-muted" : ""}
                    onChange={e => updateScheduleItem(idx, "amount", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="w-32">
                  <Label className="text-xs">Échéance</Label>
                  <Input type="date" value={item.due_date} onChange={e => updateScheduleItem(idx, "due_date", e.target.value)} />
                </div>
              </div>
            );
          })}

          {/* Beach Cabin */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-beach-cabin"
              checked={beachCabin}
              onCheckedChange={(checked) => setBeachCabin(checked === true)}
            />
            <Label htmlFor="edit-beach-cabin" className="text-sm font-normal cursor-pointer">
              Cabine de plage incluse
            </Label>
            {checkinDate && checkoutDate && portalSettings && isBeachCabinPeriod(
              checkinDate, checkoutDate,
              portalSettings.beach_cabin_start_month, portalSettings.beach_cabin_start_day,
              portalSettings.beach_cabin_end_month, portalSettings.beach_cabin_end_day
            ) && (
              <Badge variant="secondary" className="text-xs">Période cabine</Badge>
            )}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes sur la réservation..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !checkinDate || !checkoutDate || nights <= 0}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
