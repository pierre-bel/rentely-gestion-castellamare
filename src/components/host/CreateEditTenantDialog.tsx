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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "./HostTenants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
}

export function CreateEditTenantDialog({ open, onOpenChange, tenant }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setFirstName(tenant?.first_name || "");
      setLastName(tenant?.last_name || "");
      setEmail(tenant?.email || "");
      setPhone(tenant?.phone || "");
      setGender(tenant?.gender || "");
      setStreet(tenant?.street || "");
      setStreetNumber(tenant?.street_number || "");
      setPostalCode(tenant?.postal_code || "");
      setCity(tenant?.city || "");
      setCountry(tenant?.country || "");
      setNotes(tenant?.notes || "");
    }
  }, [open, tenant]);

  const canSave = firstName.trim() && lastName.trim() && email.trim();

  const handleSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      gender: gender || null,
      street: street.trim() || null,
      street_number: streetNumber.trim() || null,
      postal_code: postalCode.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (tenant) {
        const { error } = await supabase
          .from("tenants")
          .update(payload)
          .eq("id", tenant.id);
        if (error) throw error;
        toast({ title: "Locataire mis à jour" });
      } else {
        const { error } = await supabase
          .from("tenants")
          .insert({ ...payload, host_user_id: user.id });
        if (error) throw error;
        toast({ title: "Locataire ajouté" });
      }
      queryClient.invalidateQueries({ queryKey: ["host-tenants"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tenant ? "Modifier le locataire" : "Nouveau locataire"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prénom *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" />
            </div>
            <div>
              <Label>Sexe</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="H">Homme</SelectItem>
                  <SelectItem value="F">Femme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" />
          </div>

          {/* Address */}
          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Adresse</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Rue</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rue principale" />
              </div>
              <div>
                <Label>Numéro</Label>
                <Input value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} placeholder="12A" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <Label>Code postal</Label>
                <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="75001" />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
              </div>
              <div>
                <Label>Pays</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="France" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes sur le locataire..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Enregistrement..." : tenant ? "Mettre à jour" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
