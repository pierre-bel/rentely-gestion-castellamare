import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Link2, MessageCircle } from "lucide-react";

interface Listing { id: string; title: string }
interface ExternalStaff {
  id: string; name: string; phone: string | null; access_token: string;
  portal_past_months: number; portal_future_months: number;
  all_listings: boolean; show_tenant_names: boolean; is_active: boolean;
}

export function ExternalCleaningLinksDialog({ open, onOpenChange, listings }: {
  open: boolean; onOpenChange: (o: boolean) => void; listings: Listing[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const { data: links = [] } = useQuery({
    queryKey: ["external-cleaning-links", user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("cleaning_staff")
        .select("id, name, phone, access_token, portal_past_months, portal_future_months, all_listings, show_tenant_names, is_active")
        .eq("host_user_id", user!.id).eq("is_external", true).order("name");
      if (error) throw error;
      return data as ExternalStaff[];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["external-cleaning-assignments", user?.id, links.map(l => l.id).join(",")],
    enabled: links.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("cleaning_staff_listings")
        .select("id, cleaning_staff_id, listing_id").in("cleaning_staff_id", links.map(l => l.id));
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["external-cleaning-links"] });
    qc.invalidateQueries({ queryKey: ["external-cleaning-assignments"] });
  };
  const err = (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" });

  const add = async () => {
    if (!user?.id || !name.trim()) return;
    const { error } = await supabase.from("cleaning_staff").insert({
      host_user_id: user.id, name: name.trim(), phone: phone.trim() || null,
      is_external: true, all_listings: true,
    });
    if (error) return err(error);
    setName(""); setPhone(""); refresh();
    toast({ title: "Lien créé" });
  };

  const update = async (id: string, patch: Partial<ExternalStaff>) => {
    const { error } = await supabase.from("cleaning_staff").update(patch).eq("id", id);
    if (error) return err(error);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce lien ? Il cessera de fonctionner immédiatement.")) return;
    const { error } = await supabase.from("cleaning_staff").delete().eq("id", id);
    if (error) return err(error);
    refresh();
  };

  const toggleListing = async (staffId: string, listingId: string) => {
    if (!user?.id) return;
    const existing = assignments.find(a => a.cleaning_staff_id === staffId && a.listing_id === listingId);
    const { error } = existing
      ? await supabase.from("cleaning_staff_listings").delete().eq("id", existing.id)
      : await supabase.from("cleaning_staff_listings").insert({ cleaning_staff_id: staffId, listing_id: listingId, host_user_id: user.id });
    if (error) return err(error);
    refresh();
  };

  const urlFor = (s: ExternalStaff) => `${window.location.origin}/cleaning-portal/${s.access_token}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Liens externes</DialogTitle>
          <DialogDescription>
            Partagez le planning avec une personne extérieure, sans modifier votre équipe de ménage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Nouveau lien</Label>
          <div className="flex gap-2">
            <Input placeholder="Nom (ex. Marie – remplaçante)" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} className="w-36" />
            <Button size="icon" onClick={add} disabled={!name.trim()}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun lien externe pour le moment</p>
        ) : (
          <div className="space-y-4">
            {links.map(s => (
              <div key={s.id} className="border border-border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!s.is_active && <Badge variant="outline">Désactivé</Badge>}
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Copier le lien"
                      onClick={() => { navigator.clipboard.writeText(urlFor(s)); toast({ title: "Lien copié !" }); }}>
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Envoyer par WhatsApp"
                      onClick={() => window.open(`https://wa.me/${(s.phone || "").replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Bonjour ${s.name}, voici le planning : ${urlFor(s)}`)}`, "_blank")}>
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Lien actif</Label>
                  <Switch checked={s.is_active} onCheckedChange={v => update(s.id, { is_active: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Afficher nom et téléphone des locataires</Label>
                  <Switch checked={s.show_tenant_names} onCheckedChange={v => update(s.id, { show_tenant_names: v })} />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-normal flex-1">Mois passés / à venir visibles</Label>
                  <Input type="number" min={0} max={24} className="w-16 h-8" defaultValue={s.portal_past_months}
                    onBlur={e => update(s.id, { portal_past_months: Math.max(0, Number(e.target.value) || 0) })} />
                  <Input type="number" min={0} max={24} className="w-16 h-8" defaultValue={s.portal_future_months}
                    onBlur={e => update(s.id, { portal_future_months: Math.max(0, Number(e.target.value) || 0) })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Tous les appartements</Label>
                  <Switch checked={s.all_listings} onCheckedChange={v => update(s.id, { all_listings: v })} />
                </div>
                {!s.all_listings && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {listings.map(l => (
                      <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={assignments.some(a => a.cleaning_staff_id === s.id && a.listing_id === l.id)}
                          onCheckedChange={() => toggleListing(s.id, l.id)}
                        />
                        <span className="truncate">{l.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
