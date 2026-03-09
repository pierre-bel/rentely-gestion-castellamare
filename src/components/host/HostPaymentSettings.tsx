import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { selectByOwner, selectOne, insertRow, deleteById, upsertByOwner, withToast } from "@/lib/supabase-helpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, GripVertical, Umbrella, CreditCard } from "lucide-react";
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
      const { data, error } = await selectByOwner<PaymentScheduleTemplate>(
        "host_payment_schedules", "host_user_id", user.id,
        { order: "sort_order", ascending: true }
      );
      if (error) throw new Error(error);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const handleAdd = async () => {
    if (!user?.id || !newLabel.trim() || !newPercentage) return;
    setSaving(true);
    const success = await withToast(
      () => insertRow("host_payment_schedules", {
        host_user_id: user.id, label: newLabel.trim(),
        percentage: parseFloat(newPercentage), due_type: newDueType,
        due_days: parseInt(newDueDays) || 0, sort_order: templates.length,
      }),
      toast, "Échéance ajoutée"
    );
    if (success) {
      queryClient.invalidateQueries({ queryKey: ["host-payment-schedules"] });
      setNewLabel(""); setNewPercentage(""); setNewDueType("on_booking"); setNewDueDays("0");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    const success = await withToast(
      () => deleteById("host_payment_schedules", id),
      toast, "Échéance supprimée"
    );
    if (success) queryClient.invalidateQueries({ queryKey: ["host-payment-schedules"] });
    setSaving(false);
  };

  const dueTypeLabels: Record<string, string> = {
    on_booking: "À la réservation",
    before_checkin: "Avant l'arrivée",
    after_checkout: "Après le départ",
  };

  const totalPercentage = templates.reduce((s, t) => s + t.percentage, 0);

  return (
    <div className="space-y-6">
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

      <BankCredentialsSettings />
      <BeachCabinPeriodSettings />
    </div>
  );
}

function BankCredentialsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [beneficiary, setBeneficiary] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [referenceTemplate, setReferenceTemplate] = useState("{{guest_last_name}} - {{listing_title}} - {{checkin_date}} au {{checkout_date}}");

  const { data: settings } = useQuery({
    queryKey: ["portal-settings-bank", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await selectOne(
        "portal_settings", "host_user_id", user.id,
        "bank_beneficiary_name, bank_iban, bank_bic"
      );
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (settings) {
      setBeneficiary(settings.bank_beneficiary_name || "");
      setIban(settings.bank_iban || "");
      setBic(settings.bank_bic || "");
    }
  }, [settings]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const success = await withToast(
      () => upsertByOwner("portal_settings", "host_user_id", user.id, {
        bank_beneficiary_name: beneficiary.trim() || null,
        bank_iban: iban.replace(/\s/g, "").toUpperCase() || null,
        bank_bic: bic.replace(/\s/g, "").toUpperCase() || null,
      }),
      toast, "Coordonnées bancaires enregistrées"
    );
    if (success) queryClient.invalidateQueries({ queryKey: ["portal-settings-bank"] });
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Coordonnées bancaires (QR SEPA)</CardTitle>
        </div>
        <CardDescription>
          Ces informations seront utilisées pour générer un QR code de paiement SEPA sur le portail locataire. Le locataire scanne le QR avec son app bancaire et le virement est pré-rempli.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Nom du bénéficiaire</Label>
          <Input value={beneficiary} onChange={e => setBeneficiary(e.target.value)} placeholder="Ex: Jean Dupont" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">IBAN</Label>
            <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">BIC / SWIFT</Label>
            <Input value={bic} onChange={e => setBic(e.target.value)} placeholder="BNPAFRPP" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ces données ne sont jamais partagées directement — elles sont uniquement encodées dans le QR code affiché sur le portail.
        </p>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}

function BeachCabinPeriodSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [startMonth, setStartMonth] = useState("6");
  const [startDay, setStartDay] = useState("1");
  const [endMonth, setEndMonth] = useState("9");
  const [endDay, setEndDay] = useState("30");

  const { data: settings } = useQuery({
    queryKey: ["portal-settings-beach", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await selectOne(
        "portal_settings", "host_user_id", user.id,
        "beach_cabin_start_month, beach_cabin_start_day, beach_cabin_end_month, beach_cabin_end_day"
      );
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (settings) {
      setStartMonth(String(settings.beach_cabin_start_month));
      setStartDay(String(settings.beach_cabin_start_day));
      setEndMonth(String(settings.beach_cabin_end_month));
      setEndDay(String(settings.beach_cabin_end_day));
    }
  }, [settings]);

  const monthOptions = [
    { value: "1", label: "Janvier" }, { value: "2", label: "Février" }, { value: "3", label: "Mars" },
    { value: "4", label: "Avril" }, { value: "5", label: "Mai" }, { value: "6", label: "Juin" },
    { value: "7", label: "Juillet" }, { value: "8", label: "Août" }, { value: "9", label: "Septembre" },
    { value: "10", label: "Octobre" }, { value: "11", label: "Novembre" }, { value: "12", label: "Décembre" },
  ];

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const updateData = {
      beach_cabin_start_month: parseInt(startMonth),
      beach_cabin_start_day: parseInt(startDay),
      beach_cabin_end_month: parseInt(endMonth),
      beach_cabin_end_day: parseInt(endDay),
    };

    const success = await withToast(
      () => upsertByOwner("portal_settings", "host_user_id", user.id, updateData),
      toast, "Période cabine de plage enregistrée"
    );
    if (success) queryClient.invalidateQueries({ queryKey: ["portal-settings-beach"] });
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Umbrella className="h-5 w-5 text-primary" />
          <CardTitle>Cabine de plage</CardTitle>
        </div>
        <CardDescription>
          Définissez la période annuelle pendant laquelle la cabine de plage est automatiquement incluse dans les réservations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Début de la période</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                max="31"
                value={startDay}
                onChange={e => setStartDay(e.target.value)}
                placeholder="Jour"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Fin de la période</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                max="31"
                value={endDay}
                onChange={e => setEndDay(e.target.value)}
                placeholder="Jour"
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Les réservations dont les dates chevauchent cette période auront la case "Cabine de plage" automatiquement cochée.
        </p>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}
