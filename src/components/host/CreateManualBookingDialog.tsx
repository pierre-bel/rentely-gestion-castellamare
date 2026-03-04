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
import { CalendarIcon, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays } from "date-fns";
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

const DEPOSIT_PERCENTAGE = 30; // Fixed deposit percentage

export function CreateManualBookingDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [selectedListingId, setSelectedListingId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [checkinDate, setCheckinDate] = useState<Date>();
  const [checkoutDate, setCheckoutDate] = useState<Date>();
  const [guests, setGuests] = useState("1");
  const [totalPrice, setTotalPrice] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [newTenantDialogOpen, setNewTenantDialogOpen] = useState(false);

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

  const nights = checkinDate && checkoutDate
    ? differenceInCalendarDays(checkoutDate, checkinDate)
    : 0;

  // Auto-calc price when listing or dates change
  useEffect(() => {
    if (selectedListingId && nights > 0) {
      const listing = listings.find((l) => l.id === selectedListingId);
      if (listing) {
        const nightsTotal = listing.base_price * nights;
        const cf = listing.cleaning_fee || 0;
        setCleaningFee(cf.toFixed(2));
        const total = nightsTotal + cf;
        setTotalPrice(total.toFixed(2));
        // Auto-calc deposit
        setDeposit(Math.round(total * DEPOSIT_PERCENTAGE / 100).toFixed(2));
      }
    }
  }, [selectedListingId, nights, listings]);

  // Recalc deposit when total changes
  useEffect(() => {
    const total = parseFloat(totalPrice) || 0;
    if (total > 0) {
      setDeposit(Math.round(total * DEPOSIT_PERCENTAGE / 100).toFixed(2));
    }
  }, [totalPrice]);

  const totalNum = parseFloat(totalPrice) || 0;
  const depositNum = parseFloat(deposit) || 0;
  const remaining = Math.max(0, totalNum - depositNum);

  const resetForm = () => {
    setSelectedListingId("");
    setSelectedTenantId("");
    setCheckinDate(undefined);
    setCheckoutDate(undefined);
    setGuests("1");
    setTotalPrice("");
    setCleaningFee("");
    setDeposit("");
    setNotes("");
  };

  const handleSave = async () => {
    if (!user || !selectedListingId || !checkinDate || !checkoutDate || nights <= 0) return;
    setSaving(true);

    try {
      const tenant = tenants.find((t) => t.id === selectedTenantId);
      const cf = parseFloat(cleaningFee) || 0;

      const { error } = await supabase.from("bookings").insert({
        listing_id: selectedListingId,
        guest_user_id: user.id,
        checkin_date: format(checkinDate, "yyyy-MM-dd"),
        checkout_date: format(checkoutDate, "yyyy-MM-dd"),
        nights,
        guests: parseInt(guests) || 1,
        subtotal: totalNum - cf,
        cleaning_fee: cf,
        total_price: totalNum,
        host_payout_gross: totalNum,
        host_payout_net: totalNum,
        status: "confirmed",
        currency: "EUR",
        pricing_breakdown: {
          deposit: depositNum,
          remaining: remaining,
          deposit_percentage: DEPOSIT_PERCENTAGE,
        },
        notes: [
          tenant ? `Locataire: ${tenant.first_name} ${tenant.last_name || ""}`.trim() : null,
          depositNum > 0 ? `Acompte: ${depositNum.toFixed(2)} € | Solde: ${remaining.toFixed(2)} €` : null,
          notes.trim() || null,
        ].filter(Boolean).join(" | ") || null,
      });

      if (error) throw error;

      toast({ title: "Réservation créée", description: `${nights} nuit(s) ajoutée(s) avec succès.` });
      queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["host-calendar-bookings"] });
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

            {/* Guests */}
            <div>
              <Label>Voyageurs</Label>
              <Input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} />
            </div>

            {/* Pricing section */}
            <Separator />
            <p className="text-sm font-medium">Tarification</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frais de ménage (€)</Label>
                <Input type="number" min="0" step="0.01" value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Prix total (€)</Label>
                <Input type="number" min="0" step="0.01" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Acompte ({DEPOSIT_PERCENTAGE}%) (€)</Label>
                <Input type="number" min="0" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Solde restant (€)</Label>
                <Input type="number" value={remaining.toFixed(2)} readOnly className="bg-muted" />
              </div>
            </div>

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
