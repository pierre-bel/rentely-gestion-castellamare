import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Send, Mail, Info, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TRIGGER_LABELS: Record<string, string> = {
  booking_confirmed: "À la confirmation de réservation",
  days_before_checkin: "X jours avant l'arrivée",
  day_of_checkin: "Le jour de l'arrivée",
  days_after_checkin: "X jours après l'arrivée",
  days_before_checkout: "X jours avant le départ",
  day_of_checkout: "Le jour du départ",
  days_after_checkout: "X jours après le départ",
};

const DYNAMIC_VARIABLES = [
  { key: "guest_first_name", label: "Prénom du locataire" },
  { key: "guest_last_name", label: "Nom du locataire" },
  { key: "guest_full_name", label: "Nom complet du locataire" },
  { key: "guest_email", label: "E-mail du locataire" },
  { key: "checkin_date", label: "Date d'arrivée" },
  { key: "checkout_date", label: "Date de départ" },
  { key: "nights", label: "Nombre de nuits" },
  { key: "guests_count", label: "Nombre de voyageurs" },
  { key: "total_price", label: "Prix total" },
  { key: "listing_title", label: "Nom du bien" },
  { key: "listing_address", label: "Adresse du bien" },
  { key: "listing_city", label: "Ville du bien" },
  { key: "listing_country", label: "Pays du bien" },
  { key: "booking_id", label: "ID de réservation" },
];

interface EmailAutomation {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  trigger_type: string;
  trigger_days: number;
  is_enabled: boolean;
  listing_id: string | null;
  created_at: string;
}

const DEFAULT_BODY = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Bonjour {{guest_first_name}},</h2>
  <p>Votre réservation pour <strong>{{listing_title}}</strong> est confirmée.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Arrivée</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{{checkin_date}}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Départ</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{{checkout_date}}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Nuits</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{{nights}}</td></tr>
    <tr><td style="padding: 8px;"><strong>Total</strong></td><td style="padding: 8px;">{{total_price}}</td></tr>
  </table>
  <p>À bientôt !</p>
</div>`;

export default function HostEmailAutomations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<EmailAutomation | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testAutomation, setTestAutomation] = useState<EmailAutomation | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState(DEFAULT_BODY);
  const [formTrigger, setFormTrigger] = useState("booking_confirmed");
  const [formDays, setFormDays] = useState(1);
  const [formEnabled, setFormEnabled] = useState(true);

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["email-automations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_automations")
        .select("*")
        .eq("host_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailAutomation[];
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (automation: {
      name: string;
      subject: string;
      body_html: string;
      trigger_type: "booking_confirmed" | "days_before_checkin" | "day_of_checkin" | "days_after_checkin" | "days_before_checkout" | "day_of_checkout" | "days_after_checkout";
      trigger_days: number;
      is_enabled: boolean;
    }) => {
      if (editingAutomation) {
        const { error } = await supabase
          .from("email_automations")
          .update(automation)
          .eq("id", editingAutomation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_automations")
          .insert([{ ...automation, host_user_id: user!.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automations"] });
      setDialogOpen(false);
      toast({ title: editingAutomation ? "Automatisation mise à jour" : "Automatisation créée" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automations"] });
      toast({ title: "Automatisation supprimée" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("email_automations")
        .update({ is_enabled: enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automations"] });
    },
  });

  const openCreate = () => {
    setEditingAutomation(null);
    setFormName("");
    setFormSubject("Confirmation de votre réservation - {{listing_title}}");
    setFormBody(DEFAULT_BODY);
    setFormTrigger("booking_confirmed");
    setFormDays(1);
    setFormEnabled(true);
    setDialogOpen(true);
  };

  const openEdit = (auto: EmailAutomation) => {
    setEditingAutomation(auto);
    setFormName(auto.name);
    setFormSubject(auto.subject);
    setFormBody(auto.body_html);
    setFormTrigger(auto.trigger_type);
    setFormDays(auto.trigger_days);
    setFormEnabled(auto.is_enabled);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName || !formSubject || !formBody) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      name: formName,
      subject: formSubject,
      body_html: formBody,
      trigger_type: formTrigger as any,
      trigger_days: formDays,
      is_enabled: formEnabled,
    });
  };

  const handleTestSend = async () => {
    if (!testEmail || !testAutomation) return;
    setSendingTest(true);
    try {
      const testVariables: Record<string, string> = {};
      DYNAMIC_VARIABLES.forEach((v) => {
        testVariables[v.key] = `[${v.label}]`;
      });
      // Override some with sample data
      testVariables.guest_first_name = "Jean";
      testVariables.guest_last_name = "Dupont";
      testVariables.guest_full_name = "Jean Dupont";
      testVariables.checkin_date = "2026-04-15";
      testVariables.checkout_date = "2026-04-20";
      testVariables.nights = "5";
      testVariables.guests_count = "2";
      testVariables.total_price = "750.00 €";
      testVariables.listing_title = "Bel Appartement Paris 11e";
      testVariables.listing_address = "12 rue de la Roquette";
      testVariables.listing_city = "Paris";
      testVariables.listing_country = "France";
      testVariables.booking_id = "test-123";

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          action: "test",
          subject: testAutomation.subject,
          body_html: testAutomation.body_html,
          test_email: testEmail,
          variables: testVariables,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "E-mail de test envoyé !", description: `Envoyé à ${testEmail}` });
      setTestDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erreur d'envoi", description: err.message, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  };

  const openTestDialog = (auto: EmailAutomation) => {
    setTestAutomation(auto);
    setTestEmail(user?.email || "");
    setTestDialogOpen(true);
  };

  const copyVariable = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    toast({ title: "Copié !", description: `{{${key}}} copié dans le presse-papier` });
  };

  const showDays = ["days_before_checkin", "days_after_checkin", "days_before_checkout", "days_after_checkout"].includes(formTrigger);

  const getTriggerLabel = (auto: EmailAutomation) => {
    const base = TRIGGER_LABELS[auto.trigger_type] || auto.trigger_type;
    if (["days_before_checkin", "days_after_checkin", "days_before_checkout", "days_after_checkout"].includes(auto.trigger_type)) {
      return base.replace("X", String(auto.trigger_days));
    }
    return base;
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">E-mails automatiques</h2>
            <p className="text-sm text-muted-foreground">
              Configurez des e-mails envoyés automatiquement à vos locataires selon des déclencheurs.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau modèle
          </Button>
        </div>

        {/* Variables reference */}
        <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Variables dynamiques disponibles</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DYNAMIC_VARIABLES.map((v) => (
              <Tooltip key={v.key}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => copyVariable(v.key)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {`{{${v.key}}}`}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{v.label} — cliquer pour copier</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement...</p>
        ) : automations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune automatisation e-mail configurée.</p>
            <p className="text-sm">Créez votre premier modèle pour commencer.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Déclencheur</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((auto) => (
                  <TableRow key={auto.id}>
                    <TableCell className="font-medium">{auto.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTriggerLabel(auto)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {auto.subject}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={auto.is_enabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: auto.id, enabled: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openTestDialog(auto)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Envoyer un test</TooltipContent>
                        </Tooltip>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(auto)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(auto.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAutomation ? "Modifier l'automatisation" : "Nouvelle automatisation e-mail"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nom de l'automatisation *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Confirmation de réservation"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Déclencheur *</Label>
                <Select value={formTrigger} onValueChange={setFormTrigger}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showDays && (
                <div>
                  <Label>Nombre de jours</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formDays}
                    onChange={(e) => setFormDays(parseInt(e.target.value) || 1)}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Sujet de l'e-mail *</Label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Ex: Confirmation - {{listing_title}}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Vous pouvez utiliser les variables dynamiques ci-dessus.
              </p>
            </div>

            <div>
              <Label>Corps de l'e-mail (HTML) *</Label>
              <Textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                placeholder="<div>Bonjour {{guest_first_name}},...</div>"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formEnabled} onCheckedChange={setFormEnabled} />
              <Label>Actif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer un e-mail de test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Un e-mail de test sera envoyé avec des données d'exemple pour les variables dynamiques.
            </p>
            <div>
              <Label>Adresse e-mail de test</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="votre@email.com"
              />
            </div>
            {testAutomation && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Modèle :</strong> {testAutomation.name}</p>
                <p><strong>Sujet :</strong> {testAutomation.subject}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleTestSend} disabled={sendingTest || !testEmail}>
              <Send className="h-4 w-4 mr-2" />
              {sendingTest ? "Envoi en cours..." : "Envoyer le test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
