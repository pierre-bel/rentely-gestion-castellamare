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
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setFirstName(tenant?.first_name || "");
      setLastName(tenant?.last_name || "");
      setEmail(tenant?.email || "");
      setPhone(tenant?.phone || "");
      setNotes(tenant?.notes || "");
    }
  }, [open, tenant]);

  const handleSave = async () => {
    if (!user || !firstName.trim()) return;
    setSaving(true);

    try {
      if (tenant) {
        const { error } = await supabase
          .from("tenants")
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            notes: notes.trim() || null,
          })
          .eq("id", tenant.id);
        if (error) throw error;
        toast({ title: "Locataire mis à jour" });
      } else {
        const { error } = await supabase
          .from("tenants")
          .insert({
            host_user_id: user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            notes: notes.trim() || null,
          });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tenant ? "Modifier le locataire" : "Nouveau locataire"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prénom *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes sur le locataire..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !firstName.trim()}>
            {saving ? "Enregistrement..." : tenant ? "Mettre à jour" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
