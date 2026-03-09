import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { selectByOwner, replaceAllForOwner, withToast } from "@/lib/supabase-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, GripVertical, Trash2, Loader2, Settings2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const DEFAULT_CRITERIA = [
  { criterion_key: "rating_cleanliness", label: "Propreté", description: "État de propreté du logement", is_default: true },
  { criterion_key: "rating_location", label: "Emplacement", description: "Localisation et accessibilité", is_default: true },
  { criterion_key: "rating_communication", label: "Communication", description: "Réactivité et clarté de l'hôte", is_default: true },
  { criterion_key: "rating_value", label: "Rapport qualité/prix", description: "Adéquation prix / prestation", is_default: true },
  { criterion_key: "rating_maintenance", label: "État du logement", description: "Travaux, équipements à réparer", is_default: true },
];

interface Criterion {
  id?: string;
  criterion_key: string;
  label: string;
  description: string;
  is_enabled: boolean;
  is_default: boolean;
  sort_order: number;
}

export function ReviewCriteriaConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadCriteria();
  }, [user]);

  const loadCriteria = async () => {
    setLoading(true);
    const { data, error } = await selectByOwner<Criterion>(
      "host_review_criteria", "host_user_id", user!.id,
      { order: "sort_order", ascending: true }
    );

    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setCriteria(DEFAULT_CRITERIA.map((d, i) => ({ ...d, is_enabled: true, sort_order: i })));
    } else {
      setCriteria(data.map((d) => ({
        id: d.id, criterion_key: d.criterion_key, label: d.label,
        description: d.description || "", is_enabled: d.is_enabled,
        is_default: d.is_default, sort_order: d.sort_order,
      })));
    }
    setLoading(false);
  };

  const addCriterion = () => {
    const key = `custom_${Date.now()}`;
    setCriteria((prev) => [
      ...prev,
      {
        criterion_key: key,
        label: "",
        description: "",
        is_enabled: true,
        is_default: false,
        sort_order: prev.length,
      },
    ]);
  };

  const removeCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, updates: Partial<Criterion>) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validate
    const enabledCriteria = criteria.filter((c) => c.is_enabled);
    if (enabledCriteria.some((c) => !c.label.trim())) {
      toast({ title: "Veuillez remplir tous les noms de critères actifs", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Delete all existing then re-insert
      await supabase
        .from("host_review_criteria")
        .delete()
        .eq("host_user_id", user.id);

      const rows = criteria.map((c, i) => ({
        host_user_id: user.id,
        criterion_key: c.criterion_key,
        label: c.label,
        description: c.description,
        is_enabled: c.is_enabled,
        is_default: c.is_default,
        sort_order: i,
      }));

      const { error } = await supabase
        .from("host_review_criteria")
        .insert(rows as any);

      if (error) throw error;
      toast({ title: "Configuration des avis sauvegardée" });
      await loadCriteria();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Critères de notation</h3>
          </div>
          <Button variant="outline" size="sm" onClick={addCriterion} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Configurez les critères que vos locataires pourront noter. Renommez, activez/désactivez ou ajoutez vos propres critères.
        </p>

        <Separator />

        <div className="space-y-3">
          {criteria.map((c, index) => (
            <div
              key={c.criterion_key}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                c.is_enabled ? "bg-card border-border" : "bg-muted/30 border-muted opacity-60"
              }`}
            >
              <GripVertical className="h-4 w-4 mt-2.5 text-muted-foreground/50 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Input
                    value={c.label}
                    onChange={(e) => updateCriterion(index, { label: e.target.value })}
                    placeholder="Nom du critère"
                    className="h-8 text-sm font-medium"
                  />
                  <Switch
                    checked={c.is_enabled}
                    onCheckedChange={(checked) => updateCriterion(index, { is_enabled: checked })}
                  />
                </div>
                <Input
                  value={c.description}
                  onChange={(e) => updateCriterion(index, { description: e.target.value })}
                  placeholder="Description courte (optionnel)"
                  className="h-7 text-xs"
                />
              </div>
              {!c.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive mt-0.5"
                  onClick={() => removeCriterion(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Sauvegarde…" : "Sauvegarder la configuration"}
        </Button>
      </CardContent>
    </Card>
  );
}
