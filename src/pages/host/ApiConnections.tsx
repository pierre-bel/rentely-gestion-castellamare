import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { format } from "date-fns";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const fmt = (d: string | null) => (d ? format(new Date(d), "dd-MM-yyyy HH:mm") : "—");

export default function ApiConnections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys = [] } = useQuery({
    queryKey: ["host-api-keys", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("host_api_keys")
        .select("id, name, prefix, created_at, last_used_at, revoked_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const create = async () => {
    if (!user || !name.trim()) return;
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = "ck_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("host_api_keys").insert({
      host_id: user.id, name: name.trim().slice(0, 100), key_hash: await sha256(key), prefix: key.slice(0, 10),
    });
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setNewKey(key);
    setName("");
    qc.invalidateQueries({ queryKey: ["host-api-keys"] });
  };

  const revoke = async (id: string) => {
    await supabase.from("host_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["host-api-keys"] });
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Copié" }); };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Connexions API</h1>
        <p className="text-sm text-muted-foreground">Connectez un autre logiciel grâce à une clé API.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Créer une clé</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Nom (ex. Mon logiciel compta)" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={create} disabled={!name.trim()}><KeyRound className="h-4 w-4 mr-2" />Créer</Button>
          </div>
          {newKey && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Copiez cette clé maintenant, elle ne sera plus affichée :</p>
              <div className="flex gap-2 items-center">
                <code className="text-xs break-all flex-1">{newKey}</code>
                <Button size="sm" variant="outline" onClick={() => copy(newKey)}><Copy className="h-3 w-3 mr-1" />Copier</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mes clés</CardTitle></CardHeader>
        <CardContent>
          {keys.length === 0 ? <p className="text-sm text-muted-foreground">Aucune clé.</p> : (
            <div className="divide-y">
              {keys.map((k: any) => (
                <div key={k.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{k.name} <span className="text-xs text-muted-foreground font-mono">{k.prefix}…</span></p>
                    <p className="text-xs text-muted-foreground">Créée le {fmt(k.created_at)} · Dernière utilisation : {fmt(k.last_used_at)}</p>
                  </div>
                  {k.revoked_at ? <span className="text-xs text-muted-foreground">Révoquée le {fmt(k.revoked_at)}</span> : (
                    <Button size="sm" variant="outline" onClick={() => revoke(k.id)}><Trash2 className="h-3 w-3 mr-1" />Révoquer</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Adresse : <code className="text-xs break-all">{API_URL}</code></p>
          <p>Envoyez la clé dans l'en-tête <code>X-API-Key</code>.</p>
          <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">{`# Liste des appartements
GET ${API_URL}/listings

# Réservations (filtres optionnels : listing_id, from, to au format AAAA-MM-JJ)
GET ${API_URL}/bookings?from=2026-01-01&to=2026-12-31

# Créer une réservation (statut En attente)
POST ${API_URL}/bookings
Content-Type: application/json
{ "listing_id": "...", "checkin_date": "2026-07-04", "checkout_date": "2026-07-11",
  "total_price": 900, "guest_name": "Jean Dupont", "guest_email": "jean@exemple.be" }`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
