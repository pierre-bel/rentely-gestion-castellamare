import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, GripVertical, Umbrella } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentScheduleTemplate {
  id: string;
  label: string;
  percentage: number;
  due_type: string;
  due_days: number;
  sort_order: number;
}

export function HostPaymentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPercentage, setNewPercentage] = useState("");
  const [newDueType, setNewDueType] = useState("on_booking");
  const [newDueDays, setNewDueDays] = useState("0");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["host-payment-schedules", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("host_payment_schedules")
        .select("*")
        .eq("host_user_id", user.id)
        .order("sort_order");
      if (error) throw error;
      return data as PaymentScheduleTemplate[];
    },
    enabled: !!user?.id,
  });

  const handleAdd = async () => {
    if (!user?.id || !newLabel.trim() || !newPercentage) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("host_payment_schedules").insert({
        host_user_id: user.id,
        label: newLabel.trim(),
        percentage: parseFloat(newPercentage),
        due_type: newDueType,
        due_days: parseInt(newDueDays) || 0,
        sort_order: templates.length,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["host-payment-schedules"] });
      setNewLabel("");
      setNewPercentage("");
      setNewDueType("on_booking");
      setNewDueDays("0");
      toast({ title: "Échéance ajoutée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("host_payment_schedules").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["host-payment-schedules"] });
      toast({ title: "Échéance supprimée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const dueTypeLabels: Record<string, string> = {
    on_booking: "À la réservation",
    before_checkin: "Avant l'arrivée",
    after_checkout: "Après le départ",
  };

  const totalPercentage = templates.reduce((s, t) => s + t.percentage, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Échéances de paiement par défaut</CardTitle>
        <CardDescription>
          Configurez les échéances qui seront pré-remplies lors de la création d'une réservation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current templates */}
        {templates.length > 0 && (
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.percentage}% — {dueTypeLabels[t.due_type] || t.due_type}
                    {t.due_days > 0 && ` (${t.due_days} jours)`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(t.id)} disabled={saving}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <p className={`text-xs ${totalPercentage === 100 ? "text-green-600" : "text-amber-600"}`}>
              Total : {totalPercentage}% {totalPercentage !== 100 && "(devrait être 100%)"}
            </p>
          </div>
        )}

        {templates.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Aucune échéance configurée. Ajoutez-en ci-dessous.</p>
        )}

        {/* Add form */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Ajouter une échéance</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Libellé</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Ex: Acompte" />
            </div>
            <div>
              <Label className="text-xs">Pourcentage (%)</Label>
              <Input type="number" min="0" max="100" value={newPercentage} onChange={e => setNewPercentage(e.target.value)} placeholder="30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quand</Label>
              <Select value={newDueType} onValueChange={setNewDueType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_booking">À la réservation</SelectItem>
                  <SelectItem value="before_checkin">Avant l'arrivée</SelectItem>
                  <SelectItem value="after_checkout">Après le départ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nombre de jours</Label>
              <Input type="number" min="0" value={newDueDays} onChange={e => setNewDueDays(e.target.value)} placeholder="0" />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={saving || !newLabel.trim() || !newPercentage} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
