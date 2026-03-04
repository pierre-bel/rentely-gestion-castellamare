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

interface Listing {
  id: string;
  title: string;
  base_price: number;
  cleaning_fee: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScheduleItem {
  label: string;
  amount: number;
  due_date: string;
}

const DEPOSIT_PERCENTAGE = 30;

export function CreateManualBookingDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [selectedListingId, setSelectedListingId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [checkinDate, setCheckinDate] = useState<Date>();
  const [checkoutDate, setCheckoutDate] = useState<Date>();
  const [rentalPrice, setRentalPrice] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [notes, setNotes] = useState("");
  const [newTenantDialogOpen, setNewTenantDialogOpen] = useState(false);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  // Fetch host listings
  const { data: listings = [] } = useQuery({
    queryKey: ["host-listings-simple", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, base_price, cleaning_fee")
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

  const nights = checkinDate && checkoutDate
    ? differenceInCalendarDays(checkoutDate, checkinDate)
    : 0;

  // Auto-fill prices when listing or dates change
  useEffect(() => {
    if (selectedListingId && nights > 0) {
      const listing = listings.find((l) => l.id === selectedListingId);
      if (listing) {
        const nightsTotal = listing.base_price * nights;
        setRentalPrice(nightsTotal.toFixed(2));
        setCleaningFee((listing.cleaning_fee || 0).toFixed(2));
      }
    }
  }, [selectedListingId, nights, listings]);

  const rentalNum = parseFloat(rentalPrice) || 0;
  const cleaningNum = parseFloat(cleaningFee) || 0;
  const totalNum = rentalNum + cleaningNum;

  // Auto-generate schedule items from default templates when total or dates change
  useEffect(() => {
    if (totalNum > 0 && checkinDate && checkoutDate && defaultSchedules.length > 0) {
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
      // Adjust last item to match total exactly
      if (items.length > 0) {
        const sumSoFar = items.slice(0, -1).reduce((s, i) => s + i.amount, 0);
        items[items.length - 1].amount = totalNum - sumSoFar;
      }
      setScheduleItems(items);
    } else if (totalNum > 0 && defaultSchedules.length === 0) {
      // Fallback: single item = total
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
    setSelectedListingId("");
    setSelectedTenantId("");
    setCheckinDate(undefined);
    setCheckoutDate(undefined);
    setRentalPrice("");
    setCleaningFee("");
    setNotes("");
    setScheduleItems([]);
  };

  const handleSave = async () => {
    if (!user || !selectedListingId || !checkinDate || !checkoutDate || nights <= 0) return;
    setSaving(true);

    try {
      const tenant = tenants.find((t) => t.id === selectedTenantId);

      const { data: bookingData, error } = await supabase.from("bookings").insert({
        listing_id: selectedListingId,
        guest_user_id: user.id,
        checkin_date: format(checkinDate, "yyyy-MM-dd"),
        checkout_date: format(checkoutDate, "yyyy-MM-dd"),
        nights,
        guests: 1,
        subtotal: rentalNum,
        cleaning_fee: cleaningNum,
        total_price: totalNum,
        host_payout_gross: totalNum,
        host_payout_net: totalNum,
        status: "confirmed",
        currency: "EUR",
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

      toast({ title: "Réservation créée", description: `${nights} nuit(s) ajoutée(s) avec succès.` });
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
            <DialogTitle>Nouvelle réservation manuelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

            {/* Tenant */}
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

            {nights > 0 && (
              <p className="text-sm text-muted-foreground">{nights} nuit(s)</p>
            )}

            {/* Pricing section */}
            <Separator />
            <p className="text-sm font-medium">Tarification</p>

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

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes sur la réservation..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !selectedListingId || !checkinDate || !checkoutDate || nights <= 0}
            >
              {saving ? "Création..." : "Créer la réservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateEditTenantDialog
        open={newTenantDialogOpen}
        onOpenChange={setNewTenantDialogOpen}
        tenant={null}
      />
    </>
  );
}
