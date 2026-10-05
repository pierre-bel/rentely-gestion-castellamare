import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id?: string;
  year: number;
  checkin_time: string;
  checkout_time: string;
}

export default function YearlyStayTimesEditor({ listingId }: { listingId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("listing_yearly_stay_times")
      .select("id, year, checkin_time, checkout_time")
      .eq("listing_id", listingId)
      .order("year");
    setRows((data || []).map((r: any) => ({ ...r, checkin_time: r.checkin_time || "", checkout_time: r.checkout_time || "" })));
  };

  useEffect(() => { load(); }, [listingId]);

  const save = async (row: Row) => {
    const { error } = await supabase.from("listing_yearly_stay_times").upsert(
      { listing_id: listingId, year: row.year, checkin_time: row.checkin_time || null, checkout_time: row.checkout_time || null },
      { onConflict: "listing_id,year" }
    );
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (row: Row) => {
    if (row.id) await supabase.from("listing_yearly_stay_times").delete().eq("id", row.id);
    load();
  };

  const add = () => {
    const used = rows.map((r) => r.year);
    let y = new Date().getFullYear();
    while (used.includes(y)) y++;
    save({ year: y, checkin_time: "", checkout_time: "" });
  };

  const update = (idx: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <div className="border rounded-xl p-4 space-y-3 mt-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Heures par année</h4>
          <p className="text-xs text-muted-foreground">Remplacent les heures par défaut pour les arrivées de l'année choisie.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter une année
        </Button>
      </div>
      {rows.length === 0 && <p className="text-xs text-muted-foreground">Aucune année définie : les heures par défaut s'appliquent.</p>}
      {rows.map((row, idx) => (
        <div key={row.id || idx} className="grid grid-cols-[90px_1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Année</label>
            <Input type="number" value={row.year}
              onChange={(e) => update(idx, { year: parseInt(e.target.value) || row.year })}
              onBlur={async () => { if (row.id) { await supabase.from("listing_yearly_stay_times").update({ year: row.year }).eq("id", row.id); load(); } }} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Arrivée</label>
            <Input type="time" value={row.checkin_time} onChange={(e) => update(idx, { checkin_time: e.target.value })} onBlur={() => save(rows[idx])} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Départ</label>
            <Input type="time" value={row.checkout_time} onChange={(e) => update(idx, { checkout_time: e.target.value })} onBlur={() => save(rows[idx])} />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(row)} aria-label="Supprimer">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
