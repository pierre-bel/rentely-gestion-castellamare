import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Merge, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "./HostTenants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
}

type MergeField = "first_name" | "last_name" | "email" | "phone" | "gender" | "street" | "street_number" | "postal_code" | "city" | "country" | "notes";

const FIELD_LABELS: Record<MergeField, string> = {
  first_name: "Prénom",
  last_name: "Nom",
  email: "Email",
  phone: "Téléphone",
  gender: "Sexe",
  street: "Rue",
  street_number: "Numéro",
  postal_code: "Code postal",
  city: "Ville",
  country: "Pays",
  notes: "Notes",
};

const MERGE_FIELDS: MergeField[] = [
  "first_name", "last_name", "email", "phone", "gender",
  "street", "street_number", "postal_code", "city", "country", "notes",
];

export function MergeTenantsDialog({ open, onOpenChange, tenants }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tenantAId, setTenantAId] = useState("");
  const [tenantBId, setTenantBId] = useState("");
  const [choices, setChoices] = useState<Record<MergeField, "a" | "b">>({} as any);
  const [merging, setMerging] = useState(false);
  const [step, setStep] = useState<"select" | "compare">("select");

  const tenantA = useMemo(() => tenants.find(t => t.id === tenantAId), [tenants, tenantAId]);
  const tenantB = useMemo(() => tenants.find(t => t.id === tenantBId), [tenants, tenantBId]);

  const availableForB = useMemo(() => tenants.filter(t => t.id !== tenantAId), [tenants, tenantAId]);

  const handleStartCompare = () => {
    if (!tenantA || !tenantB) return;
    // Auto-select: prefer non-empty values, default to A
    const initial: Record<string, "a" | "b"> = {};
    for (const field of MERGE_FIELDS) {
      const valA = tenantA[field] || "";
      const valB = tenantB[field] || "";
      if (!valA && valB) {
        initial[field] = "b";
      } else {
        initial[field] = "a";
      }
    }
    setChoices(initial as Record<MergeField, "a" | "b">);
    setStep("compare");
  };

  const handleMerge = async () => {
    if (!tenantA || !tenantB) return;
    setMerging(true);

    const mergedData: Record<string, string> = {};
    for (const field of MERGE_FIELDS) {
      const source = choices[field] === "b" ? tenantB : tenantA;
      mergedData[field] = source[field] || "";
    }

    try {
      const { error } = await supabase.rpc("merge_tenants", {
        p_keep_id: tenantA.id,
        p_absorb_id: tenantB.id,
        p_merged_data: mergedData,
      });
      if (error) throw error;

      toast({
        title: "Fusion réussie",
        description: `${tenantB.first_name} ${tenantB.last_name} a été fusionné dans ${tenantA.first_name} ${tenantA.last_name}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["host-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["host-tenant-booking-stats"] });
      handleClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setMerging(false);
    }
  };

  const handleClose = () => {
    setStep("select");
    setTenantAId("");
    setTenantBId("");
    setChoices({} as any);
    onOpenChange(false);
  };

  const formatValue = (val: string | null | undefined, field: MergeField) => {
    if (!val) return <span className="text-muted-foreground italic">—</span>;
    if (field === "gender") return val === "H" ? "Homme" : val === "F" ? "Femme" : val;
    return val;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Fusionner deux locataires
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Sélectionnez les deux fiches à fusionner. Le locataire B sera absorbé dans le locataire A."
              : "Choisissez pour chaque champ la valeur à conserver."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Locataire A (sera conservé)</Label>
              <Select value={tenantAId} onValueChange={(v) => { setTenantAId(v); if (v === tenantBId) setTenantBId(""); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionnez un locataire" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} — {t.email || "pas d'email"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
            </div>

            <div>
              <Label className="text-sm font-medium">Locataire B (sera supprimé après fusion)</Label>
              <Select value={tenantBId} onValueChange={setTenantBId} disabled={!tenantAId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionnez un locataire" />
                </SelectTrigger>
                <SelectContent>
                  {availableForB.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} — {t.email || "pas d'email"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tenantA && tenantB && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p>
                  <strong>{tenantB.first_name} {tenantB.last_name}</strong> sera supprimé et ses réservations seront transférées à{" "}
                  <strong>{tenantA.first_name} {tenantA.last_name}</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {step === "compare" && tenantA && tenantB && (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[140px_1fr_40px_1fr] gap-2 text-xs font-semibold text-muted-foreground px-2 pb-2 border-b">
              <div>Champ</div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">A</Badge>
                {tenantA.first_name} {tenantA.last_name}
              </div>
              <div />
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">B</Badge>
                {tenantB.first_name} {tenantB.last_name}
              </div>
            </div>

            {MERGE_FIELDS.map(field => {
              const valA = tenantA[field] || "";
              const valB = tenantB[field] || "";
              const isDifferent = valA !== valB;

              return (
                <RadioGroup
                  key={field}
                  value={choices[field]}
                  onValueChange={(v) => setChoices(prev => ({ ...prev, [field]: v as "a" | "b" }))}
                  className={`grid grid-cols-[140px_1fr_40px_1fr] gap-2 items-center px-2 py-1.5 rounded ${isDifferent ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                >
                  <Label className="text-sm font-medium">{FIELD_LABELS[field]}</Label>
                  <label
                    className={`flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1 ${choices[field] === "a" ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
                  >
                    <RadioGroupItem value="a" />
                    {formatValue(valA, field)}
                  </label>
                  <div />
                  <label
                    className={`flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1 ${choices[field] === "b" ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
                  >
                    <RadioGroupItem value="b" />
                    {formatValue(valB, field)}
                  </label>
                </RadioGroup>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "compare" && (
            <Button variant="outline" onClick={() => setStep("select")}>
              Retour
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          {step === "select" ? (
            <Button onClick={handleStartCompare} disabled={!tenantAId || !tenantBId}>
              Comparer
            </Button>
          ) : (
            <Button onClick={handleMerge} disabled={merging} variant="default">
              {merging ? "Fusion en cours..." : "Fusionner"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
