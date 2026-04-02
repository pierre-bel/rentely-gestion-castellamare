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
import { CalendarIcon, UserPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "./HostTenants";
import { CreateEditTenantDialog } from "./CreateEditTenantDialog";
import { Separator } from "@/components/ui/separator";
import { calculatePricingFromWeeklyRates } from "@/lib/pricingUtils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { isBeachCabinPeriod } from "@/lib/beachCabinUtils";

interface Listing {
  id: string;
  title: string;
  base_price: number;
  cleaning_fee: number | null;
  checkin_from: string | null;
  checkout_until: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: import("@/types/booking-prefill").BookingPrefillData | null;
}

interface ScheduleItem {
  label: string;
  amount: number;
  due_date: string;
}

const DEPOSIT_PERCENTAGE = 30;

export function CreateManualBookingDialog({ open, onOpenChange, prefillData }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [bookingType, setBookingType] = useState<"normal" | "owner_blocked">("normal");
  const [selectedListingId, setSelectedListingId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [checkinDate, setCheckinDate] = useState<Date>();
  const [checkoutDate, setCheckoutDate] = useState<Date>();
  const [rentalPrice, setRentalPrice] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [notes, setNotes] = useState("");
  const [igloohomeCode, setIgloohomeCode] = useState("");
  const [newTenantDialogOpen, setNewTenantDialogOpen] = useState(false);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [beachCabin, setBeachCabin] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [checkinTime, setCheckinTime] = useState("");
  const [checkoutTime, setCheckoutTime] = useState("");

  // Fetch host listings
  const { data: listings = [] } = useQuery({
    queryKey: ["host-listings-simple", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, base_price, cleaning_fee, checkin_from, checkout_until")
        .eq("host_user_id", user.id)
        .order("title");
      if (error) throw error;
      return data as Listing[];
    },
    enabled: !!user?.id && open,
  });

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

  // Fetch weekly pricing for selected listing
  const { data: weeklyPricing = [] } = useQuery({
    queryKey: ["listing-weekly-pricing-booking", selectedListingId],
    queryFn: async () => {
      if (!selectedListingId) return [];
      const { data, error } = await supabase
        .from("listing_weekly_pricing")
        .select("week_start_date, weekly_rate, weekend_rate, extra_night_weekend_rate")
        .eq("listing_id", selectedListingId)
        .order("week_start_date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedListingId && open,
  });

  // Fetch default payment schedules
  const { data: defaultSchedules = [] } = useQuery({
    queryKey: ["host-payment-schedules", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("host_payment_schedules")
        .select("*")
        .eq("host_user_id", user.id)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
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

  const nights = checkinDate && checkoutDate
    ? differenceInCalendarDays(checkoutDate, checkinDate)
    : 0;

  const [pricingSuggested, setPricingSuggested] = useState(false);

  // Auto-check beach cabin based on dates
  useEffect(() => {
    if (checkinDate && checkoutDate && portalSettings) {
      const shouldCheck = isBeachCabinPeriod(
        checkinDate,
        checkoutDate,
        portalSettings.beach_cabin_start_month,
        portalSettings.beach_cabin_start_day,
        portalSettings.beach_cabin_end_month,
        portalSettings.beach_cabin_end_day
      );
      setBeachCabin(shouldCheck);
    }
  }, [checkinDate, checkoutDate, portalSettings]);

  // Auto-fill check-in/check-out times from listing defaults
  useEffect(() => {
    const listing = listings.find((l) => l.id === selectedListingId);
    if (listing) {
      setCheckinTime(listing.checkin_from?.slice(0, 5) || "");
      setCheckoutTime(listing.checkout_until?.slice(0, 5) || "");
    }
  }, [selectedListingId, listings]);

  // Auto-fill prices when listing or dates change
  useEffect(() => {
    const listing = listings.find((l) => l.id === selectedListingId);
    if (listing && nights > 0 && checkinDate && checkoutDate) {
      if (weeklyPricing.length > 0) {
        // Use weekly pricing rules
        const result = calculatePricingFromWeeklyRates(
          checkinDate,
          checkoutDate,
          weeklyPricing,
          listing.base_price
        );
        setRentalPrice(result.total.toFixed(2));
        setPricingSuggested(true);
      } else {
        // Fallback to base_price * nights
        setRentalPrice((listing.base_price * nights).toFixed(2));
        setPricingSuggested(false);
      }
      setCleaningFee((listing.cleaning_fee || 0).toFixed(2));
    } else if (listing) {
      setCleaningFee((listing.cleaning_fee || 0).toFixed(2));
      setPricingSuggested(false);
    }
  }, [selectedListingId, nights, listings, weeklyPricing, checkinDate, checkoutDate]);

  const rentalNum = parseFloat(rentalPrice) || 0;
  const cleaningNum = parseFloat(cleaningFee) || 0;
  const totalNum = rentalNum + cleaningNum;

  // Auto-generate schedule items from default templates when total or dates change
  useEffect(() => {
    if (totalNum > 0 && checkinDate && checkoutDate && defaultSchedules.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const items: ScheduleItem[] = defaultSchedules.map((s: any) => {
        const amount = Math.round(totalNum * s.percentage / 100 / 10) * 10;
        let dueDate: Date;
        if (s.due_type === "on_booking") {
          dueDate = new Date();
        } else if (s.due_type === "before_checkin") {
          dueDate = subDays(checkinDate, s.due_days || 0);
        } else {
          dueDate = addDays(checkoutDate, s.due_days || 0);
        }
        return {
          label: s.label,
          amount,
          due_date: format(dueDate, "yyyy-MM-dd"),
        };
      });

      // If the last item (décompte) due date is in the past, collapse into single payment
      if (items.length > 1) {
        const lastDue = new Date(items[items.length - 1].due_date);
        lastDue.setHours(0, 0, 0, 0);
        if (lastDue < today) {
          // Use first item's due date rules for a single full payment
          setScheduleItems([{
            label: items[0].label,
            amount: totalNum,
            due_date: items[0].due_date,
          }]);
          return;
        }
      }

      // Adjust last item to match total exactly
      if (items.length > 0) {
        const sumSoFar = items.slice(0, -1).reduce((s, i) => s + i.amount, 0);
        items[items.length - 1].amount = totalNum - sumSoFar;
      }
      setScheduleItems(items);
    } else if (totalNum > 0 && defaultSchedules.length === 0) {
      setScheduleItems([]);
    }
  }, [totalNum, checkinDate, checkoutDate, defaultSchedules]);

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: any) => {
    setScheduleItems(prev => {
      const updated = prev.map((item, i) => i === index ? { ...item, [field]: value } : item);
      // Auto-adjust last item (décompte) when any other amount changes
      if (field === "amount" && updated.length > 1 && index < updated.length - 1) {
        const sumOthers = updated.slice(0, -1).reduce((s, i) => s + i.amount, 0);
        updated[updated.length - 1] = { ...updated[updated.length - 1], amount: Math.max(0, totalNum - sumOthers) };
      }
      return updated;
    });
  };

  const resetForm = () => {
    setBookingType("normal");
    setSelectedListingId("");
    setSelectedTenantId("");
    setCheckinDate(undefined);
    setCheckoutDate(undefined);
    setRentalPrice("");
    setCleaningFee("");
    setNotes("");
    setIgloohomeCode("");
    setScheduleItems([]);
    setBeachCabin(false);
    setBlockName("");
    setCheckinTime("");
    setCheckoutTime("");
  };

  // Apply prefill data when dialog opens with prefillData
  useEffect(() => {
    if (open && prefillData) {
      if (prefillData.listingId) setSelectedListingId(prefillData.listingId);
      if (prefillData.checkinDate) setCheckinDate(prefillData.checkinDate);
      if (prefillData.checkoutDate) setCheckoutDate(prefillData.checkoutDate);
      if (prefillData.notes) setNotes(prefillData.notes);

      // Try to match tenant by email
      if (prefillData.email && tenants.length > 0) {
        const match = tenants.find(
          (t) => t.email?.toLowerCase() === prefillData.email?.toLowerCase()
        );
        if (match) {
          setSelectedTenantId(match.id);
        }
      }
    }
  }, [open, prefillData, tenants]);

  const handleSave = async () => {
    if (!user || !selectedListingId || !checkinDate || !checkoutDate || nights <= 0) return;
    setSaving(true);

    try {
      if (bookingType === "owner_blocked") {
        // Simplified booking for blocked
        const tenant = tenants.find((t) => t.id === selectedTenantId);
        const noteParts = [];
        if (tenant) noteParts.push(`Blocage: ${tenant.first_name} ${tenant.last_name || ""}`.trim());
        else if (blockName.trim()) noteParts.push(`Blocage: ${blockName.trim()}`);
        if (notes.trim()) noteParts.push(notes.trim());

        const { error } = await supabase.from("bookings").insert({
          listing_id: selectedListingId,
          guest_user_id: user.id,
          checkin_date: format(checkinDate, "yyyy-MM-dd"),
          checkout_date: format(checkoutDate, "yyyy-MM-dd"),
          checkin_time: checkinTime || null,
          checkout_time: checkoutTime || null,
          nights,
          guests: 1,
          subtotal: 0,
          cleaning_fee: 0,
          total_price: 0,
          host_payout_gross: 0,
          host_payout_net: 0,
          status: "owner_blocked",
          currency: "EUR",
          notes: noteParts.join(" | ") || null,
        } as any);

        if (error) throw error;

        toast({ title: "Blocage créé", description: `${nights} nuit(s) bloquée(s) avec succès.` });
      } else {
        // Normal booking flow
        const tenant = tenants.find((t) => t.id === selectedTenantId);

        const { data: bookingData, error } = await supabase.from("bookings").insert({
          listing_id: selectedListingId,
          guest_user_id: user.id,
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
          status: "confirmed",
          currency: "EUR",
          igloohome_code: igloohomeCode.replace(/\D/g, "") || null,
          beach_cabin: beachCabin,
          pricing_breakdown: {
            rental_price: rentalNum,
            tenant_id: selectedTenantId || undefined,
          },
          notes: [
            tenant ? `Locataire: ${tenant.first_name} ${tenant.last_name || ""}`.trim() : null,
            notes.trim() || null,
          ].filter(Boolean).join(" | ") || null,
        }).select("id").single();

        if (error) throw error;

        // Insert payment schedule items
        if (bookingData && scheduleItems.length > 0) {
          const paymentItems = scheduleItems
            .filter(s => s.label.trim() && s.amount > 0)
            .map((s, i) => ({
              booking_id: bookingData.id,
              label: s.label,
              amount: s.amount,
              due_date: s.due_date || null,
              sort_order: i,
            }));

          if (paymentItems.length > 0) {
            const { error: pErr } = await supabase.from("booking_payment_items").insert(paymentItems);
            if (pErr) throw pErr;
          }
        }

        // Trigger instant email automations (booking_confirmed)
        if (bookingData) {
          supabase.functions.invoke("process-email-automations", {
            body: { booking_id: bookingData.id },
          }).catch((err) => console.error("Email automation trigger failed:", err));
        }

        toast({ title: "Réservation créée", description: `${nights} nuit(s) ajoutée(s) avec succès.` });
      }

      queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["host-calendar-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["host-payments-bookings"] });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
             <DialogTitle>
              {bookingType === "normal" ? "Nouvelle réservation manuelle" : "Bloquer le calendrier"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Booking Type Selector */}
            <div>
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  type="button"
                  variant={bookingType === "normal" ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setBookingType("normal")}
                >
                  Réservation
                </Button>
                <Button
                  type="button"
                  variant={bookingType === "owner_blocked" ? "default" : "outline"}
                  size="sm"
                  className={cn("text-xs", bookingType === "owner_blocked" && "bg-[hsl(var(--calendar-blocked))] hover:bg-[hsl(var(--calendar-blocked)/0.9)]")}
                  onClick={() => setBookingType("owner_blocked")}
                >
                  Blocage
                </Button>
              </div>
            </div>
            {/* Listing */}
            <div>
              <Label>Bien *</Label>
              <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un bien..." />
                </SelectTrigger>
                <SelectContent>
                  {listings.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tenant - normal only */}
            {bookingType === "normal" && (
              <div>
                <Label>Locataire</Label>
                <div className="flex gap-2">
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger className="flex-1">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewTenantDialogOpen(true)}
                    title="Nouveau locataire"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Tenant + Name field for blocked */}
            {bookingType !== "normal" && (
              <>
                <div>
                  <Label>Occupant (optionnel)</Label>
                  <div className="flex gap-2">
                    <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                      <SelectTrigger className="flex-1">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setNewTenantDialogOpen(true)}
                      title="Nouveau locataire"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Raison / Notes</Label>
                  <Input
                    value={blockName}
                    onChange={(e) => setBlockName(e.target.value)}
                    placeholder="Ex: Séjour personnel, famille, travaux..."
                  />
                </div>
              </>
            )}

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

            {nights > 0 && (
              <p className="text-sm text-muted-foreground">{nights} nuit(s)</p>
            )}

            {/* Pricing section - normal only */}
            {bookingType === "normal" && (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Tarification</p>
                  {pricingSuggested && nights > 0 && (
                    <Badge variant="secondary" className="text-xs">Calculé via tarifs hebdo</Badge>
                  )}
                </div>

                <div>
                  <Label>Prix de location (€)</Label>
                  <Input type="number" min="0" step="0.01" value={rentalPrice} onChange={(e) => setRentalPrice(e.target.value)} placeholder="0.00" />
                </div>

                <div>
                  <Label>Frais de ménage (€)</Label>
                  <Input type="number" min="0" step="0.01" value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} placeholder="0.00" />
                </div>

                <div>
                  <Label>Prix total (€)</Label>
                  <Input type="number" value={totalNum.toFixed(2)} readOnly className="bg-muted" />
                </div>

                {/* Payment schedule */}
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Échéances de paiement</p>
                </div>

                {scheduleItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {defaultSchedules.length === 0
                      ? "Configurez vos échéances par défaut dans l'onglet Paramètres."
                      : "Les échéances seront pré-remplies une fois le total calculé."}
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
                    id="beach-cabin"
                    checked={beachCabin}
                    onCheckedChange={(checked) => setBeachCabin(checked === true)}
                  />
                  <Label htmlFor="beach-cabin" className="text-sm font-normal cursor-pointer">
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

                {/* Igloohome Code */}
                <div>
                  <Label>Code clé Igloohome</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={igloohomeCode.replace(/\D/g, "").replace(/(\d{3})(?=\d)/g, "$1 ")}
                    onChange={(e) => setIgloohomeCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123 456 789"
                    maxLength={15}
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <Label>{bookingType === "normal" ? "Notes" : "Remarque"}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={bookingType === "normal" ? "Notes sur la réservation..." : "Remarque optionnelle..."} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !selectedListingId || !checkinDate || !checkoutDate || nights <= 0}
              className={cn(
                bookingType === "owner_blocked" && "bg-[hsl(var(--calendar-blocked))] hover:bg-[hsl(var(--calendar-blocked)/0.9)]"
              )}
            >
              {saving ? "Création..." : 
               bookingType === "owner_blocked" ? "Bloquer" :
               "Créer la réservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateEditTenantDialog
        open={newTenantDialogOpen}
        onOpenChange={setNewTenantDialogOpen}
        tenant={null}
        prefillData={prefillData ? {
          firstName: prefillData.firstName,
          lastName: prefillData.lastName,
          email: prefillData.email,
          phone: prefillData.phone,
          street: prefillData.street,
          streetNumber: prefillData.streetNumber,
          postalCode: prefillData.postalCode,
          city: prefillData.city,
          country: prefillData.country,
        } : undefined}
      />
    </>
  );
}
