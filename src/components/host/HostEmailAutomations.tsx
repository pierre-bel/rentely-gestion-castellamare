import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Send, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DynamicVariablesPanel, { DYNAMIC_VARIABLES } from "./email/DynamicVariablesPanel";
import EmailBodyEditor from "./email/EmailBodyEditor";

const TRIGGER_LABELS: Record<string, string> = {
  booking_confirmed: "À la confirmation de réservation",
  days_before_checkin: "X jours avant l'arrivée",
  day_of_checkin: "Le jour de l'arrivée",
  days_after_checkin: "X jours après l'arrivée",
  days_before_checkout: "X jours avant le départ",
  day_of_checkout: "Le jour du départ",
  days_after_checkout: "X jours après le départ",
};

interface EmailAutomation {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  trigger_type: string;
  trigger_days: number;
  is_enabled: boolean;
  listing_id: string | null;
  reply_to_email: string | null;
  created_at: string;
}

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
  const [formBody, setFormBody] = useState("");
  const [formTrigger, setFormTrigger] = useState("booking_confirmed");
  const [formDays, setFormDays] = useState(1);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formReplyTo, setFormReplyTo] = useState("");

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["email-automations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_automations")
        .select("*")
        .eq("host_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as EmailAutomation[];
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
      reply_to_email: string | null;
    }) => {
      if (editingAutomation) {
        const { error } = await supabase
          .from("email_automations")
          .update(automation as any)
          .eq("id", editingAutomation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_automations")
          .insert([{ ...automation, host_user_id: user!.id } as any]);
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
    setFormBody("");
    setFormTrigger("booking_confirmed");
    setFormDays(1);
    setFormEnabled(true);
    setFormReplyTo(user?.email || "");
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
    setFormReplyTo(auto.reply_to_email || "");
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
      reply_to_email: formReplyTo || null,
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
          reply_to_email: testAutomation.reply_to_email,
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

        <DynamicVariablesPanel />

        <div className="mt-6">
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
        </div>
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

            <div>
              <Label>Adresse e-mail de réponse (Reply-To)</Label>
              <Input
                type="email"
                value={formReplyTo}
                onChange={(e) => setFormReplyTo(e.target.value)}
                placeholder="votre@email.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                L'adresse à laquelle le locataire répondra. Laissez vide pour utiliser votre e-mail par défaut.
              </p>
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

            <EmailBodyEditor value={formBody} onChange={setFormBody} />

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
