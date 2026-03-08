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

const DEPOSIT_PERCENTAGE = 30;

export function EditManualBookingDialog({ open, onOpenChange, booking }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [checkinDate, setCheckinDate] = useState<Date>();
  const [checkoutDate, setCheckoutDate] = useState<Date>();
  const [rentalPrice, setRentalPrice] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [beachCabin, setBeachCabin] = useState(false);

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
      // Derive rental price = total - cleaning
      const rental = booking.total_price - cf;
      setRentalPrice(String(rental));

      const bd = booking.pricing_breakdown;
      setDeposit(bd?.deposit ? String(bd.deposit) : String(Math.round(booking.total_price * DEPOSIT_PERCENTAGE / 100 / 10) * 10));
      
      // Pre-select tenant
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
    }
  }, [booking, open, tenants]);

  const nights = checkinDate && checkoutDate
    ? differenceInCalendarDays(checkoutDate, checkinDate)
    : 0;

  const rentalNum = parseFloat(rentalPrice) || 0;
  const cleaningNum = parseFloat(cleaningFee) || 0;
  const totalNum = rentalNum + cleaningNum;

  // Recalc deposit when total changes
  useEffect(() => {
    if (totalNum > 0) {
      setDeposit((Math.round(totalNum * DEPOSIT_PERCENTAGE / 100 / 10) * 10).toFixed(2));
    }
  }, [totalNum]);

  const depositNum = parseFloat(deposit) || 0;
  const remaining = Math.max(0, totalNum - depositNum);

  const handleSave = async () => {
    if (!user || !booking || !checkinDate || !checkoutDate || nights <= 0) return;
    setSaving(true);

    try {
      const tenant = tenants.find((t) => t.id === selectedTenantId);

      const { error } = await supabase.from("bookings").update({
        checkin_date: format(checkinDate, "yyyy-MM-dd"),
        checkout_date: format(checkoutDate, "yyyy-MM-dd"),
        nights,
        guests: 1,
        subtotal: rentalNum,
        cleaning_fee: cleaningNum,
        total_price: totalNum,
        host_payout_gross: totalNum,
        host_payout_net: totalNum,
        pricing_breakdown: {
          rental_price: rentalNum,
          deposit: depositNum,
          remaining: remaining,
          deposit_percentage: DEPOSIT_PERCENTAGE,
          tenant_id: selectedTenantId || undefined,
        },
        notes: [
          tenant ? `Locataire: ${tenant.first_name} ${tenant.last_name || ""}`.trim() : null,
          depositNum > 0 ? `Acompte: ${depositNum.toFixed(2)} € | Solde: ${remaining.toFixed(2)} €` : null,
          notes.trim() || null,
        ].filter(Boolean).join(" | ") || null,
      }).eq("id", booking.id);

      if (error) throw error;

      toast({ title: "Réservation modifiée", description: "Les modifications ont été enregistrées." });
      queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["host-calendar-bookings"] });
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Acompte ({DEPOSIT_PERCENTAGE}%) (€)</Label>
              <Input type="number" min="0" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </div>
            <div>
              <Label>Solde restant (€)</Label>
              <Input type="number" value={remaining.toFixed(2)} readOnly className="bg-muted" />
            </div>
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
