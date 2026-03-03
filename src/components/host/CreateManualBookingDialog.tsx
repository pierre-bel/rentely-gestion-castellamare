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
import { CalendarIcon, Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "./HostTenants";
import { CreateEditTenantDialog } from "./CreateEditTenantDialog";

interface Listing {
  id: string;
  title: string;
  base_price: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const [notes, setNotes] = useState("");
  const [newTenantDialogOpen, setNewTenantDialogOpen] = useState(false);

  // Fetch host listings
  const { data: listings = [] } = useQuery({
    queryKey: ["host-listings-simple", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, base_price")
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
      if (listing && !totalPrice) {
        setTotalPrice((listing.base_price * nights).toFixed(2));
      }
    }
  }, [selectedListingId, nights, listings]);

  const resetForm = () => {
    setSelectedListingId("");
    setSelectedTenantId("");
    setCheckinDate(undefined);
    setCheckoutDate(undefined);
    setGuests("1");
    setTotalPrice("");
    setNotes("");
  };

  const handleSave = async () => {
    if (!user || !selectedListingId || !checkinDate || !checkoutDate || nights <= 0) return;
    setSaving(true);

    try {
      // Get a cancellation policy for the booking
      const { data: policies } = await supabase
        .from("cancellation_policies")
        .select("id")
        .eq("is_active", true)
        .limit(1);

      const tenant = tenants.find((t) => t.id === selectedTenantId);
      const price = parseFloat(totalPrice) || 0;

      // Insert booking - use host's own ID as guest_user_id for manual bookings
      const { error } = await supabase.from("bookings").insert({
        listing_id: selectedListingId,
        guest_user_id: user.id, // Host creates on behalf
        checkin_date: format(checkinDate, "yyyy-MM-dd"),
        checkout_date: format(checkoutDate, "yyyy-MM-dd"),
        nights,
        guests: parseInt(guests) || 1,
        subtotal: price,
        total_price: price,
        host_payout_gross: price,
        host_payout_net: price,
        status: "confirmed",
        currency: "EUR",
        notes: [
          tenant ? `Locataire: ${tenant.first_name} ${tenant.last_name || ""}`.trim() : null,
          notes.trim() || null,
        ].filter(Boolean).join(" | ") || null,
      });

      if (error) throw error;

      toast({ title: "Réservation créée", description: `${nights} nuit(s) ajoutée(s) avec succès.` });
      queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
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

            {/* Guests & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Voyageurs</Label>
                <Input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} />
              </div>
              <div>
                <Label>Prix total (€)</Label>
                <Input type="number" min="0" step="0.01" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} placeholder="0.00" />
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
