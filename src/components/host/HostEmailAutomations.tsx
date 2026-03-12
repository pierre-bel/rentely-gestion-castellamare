import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Send, Mail, Sparkles, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { selectByOwner, deleteById, updateById } from "@/lib/supabase-helpers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DynamicVariablesPanel, { DYNAMIC_VARIABLES } from "./email/DynamicVariablesPanel";
import EmailBodyEditor from "./email/EmailBodyEditor";
import { DEFAULT_EMAIL_TEMPLATES } from "./email/defaultEmailTemplates";

const TRIGGER_LABELS: Record<string, string> = {
  booking_confirmed: "À la confirmation de réservation",
  days_before_checkin: "X jours avant l'arrivée",
  day_of_checkin: "Le jour de l'arrivée",
  days_after_checkin: "X jours après l'arrivée",
  days_before_checkout: "X jours avant le départ",
  day_of_checkout: "Le jour du départ",
  days_after_checkout: "X jours après le départ",
  payment_reminder: "Rappel de paiement (manuel)",
};

interface Listing {
  id: string;
  title: string;
}

interface EmailAutomation {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  trigger_type: string;
  trigger_days: number;
  is_enabled: boolean;
  listing_ids: string[] | null;
  reply_to_email: string | null;
  recipient_type: string;
  recipient_email: string | null;
  send_if_late: boolean;
  created_at: string;
  sort_order: number;
}

interface BookingForTest {
  id: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  guests: number;
  total_price: number;
  listing_id: string;
  pricing_breakdown: Record<string, unknown> | null;
  tenant_name?: string;
}

export default function HostEmailAutomations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<EmailAutomation | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testAutomation, setTestAutomation] = useState<EmailAutomation | null>(null);
  const [testEmail, setTestEmail] = useState("castellamare345@gmail.com");
  const [sendingTest, setSendingTest] = useState(false);
  const [testBookingId, setTestBookingId] = useState<string>("sample");

  // Form state
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formTrigger, setFormTrigger] = useState("booking_confirmed");
  const [formDays, setFormDays] = useState(1);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formReplyTo, setFormReplyTo] = useState("");
  const [formListingIds, setFormListingIds] = useState<string[]>([]);
  const [formRecipientType, setFormRecipientType] = useState("tenant");
  const [formRecipientEmail, setFormRecipientEmail] = useState("");
  const [formSendIfLate, setFormSendIfLate] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  const handleLoadDefaults = async () => {
    if (!user?.id) return;
    setLoadingDefaults(true);
    try {
      const rows = DEFAULT_EMAIL_TEMPLATES.map((t, i) => ({
        host_user_id: user.id,
        name: t.name,
        subject: t.subject,
        body_html: t.body_html,
        trigger_type: t.trigger_type,
        trigger_days: t.trigger_days,
        is_enabled: true,
        recipient_type: t.recipient_type,
        recipient_email: t.recipient_type === "host" ? user.email || null : null,
        reply_to_email: user.email || null,
        send_if_late: t.send_if_late,
        listing_ids: [],
        sort_order: i,
      }));
      const { error } = await supabase.from("email_automations").insert(rows as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["email-automations"] });
      toast({ title: "9 modèles chargés", description: "Vous pouvez les personnaliser à votre convenance." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoadingDefaults(false);
    }
  };

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["email-automations", user?.id],
    queryFn: async () => {
      const { data, error } = await selectByOwner<EmailAutomation>(
        "email_automations", "host_user_id", user!.id,
        { order: "sort_order", ascending: true }
      );
      if (error) throw new Error(error);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["host-listings-simple", user?.id],
    queryFn: async () => {
      const { data, error } = await selectByOwner<Listing>(
        "listings", "host_user_id", user!.id,
        { select: "id, title", order: "title", ascending: true }
      );
      if (error) throw new Error(error);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent bookings for test
  const { data: recentBookings = [] } = useQuery({
    queryKey: ["host-recent-bookings-for-test", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, checkin_date, checkout_date, nights, guests, total_price, listing_id, pricing_breakdown")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const bookings = data as unknown as BookingForTest[];

      // Resolve tenant names from pricing_breakdown.tenant_id
      for (const b of bookings) {
        const tenantId = (b.pricing_breakdown as any)?.tenant_id;
        if (tenantId) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("first_name, last_name")
            .eq("id", tenantId)
            .single();
          if (tenant) {
            b.tenant_name = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim();
          }
        }
        if (!b.tenant_name) {
          const { data: guest } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", (data as any[]).find(d => d.id === b.id)?.guest_user_id || '')
            .maybeSingle();
          if (guest) {
            b.tenant_name = `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
          }
        }
      }
      return bookings;
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (automation: Record<string, unknown>) => {
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
      const { error } = await deleteById("email_automations", id);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automations"] });
      toast({ title: "Automatisation supprimée" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await updateById("email_automations", id, { is_enabled: enabled });
      if (error) throw new Error(error);
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
    setFormListingIds([]);
    setFormRecipientType("tenant");
    setFormRecipientEmail("");
    setFormSendIfLate(false);
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
    setFormListingIds(auto.listing_ids || []);
    setFormRecipientType(auto.recipient_type || "tenant");
    setFormRecipientEmail(auto.recipient_email || "");
    setFormSendIfLate((auto as any).send_if_late || false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName || !formSubject || !formBody) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    if (formRecipientType === "fixed" && !formRecipientEmail) {
      toast({ title: "Erreur", description: "Veuillez saisir une adresse e-mail destinataire.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      name: formName,
      subject: formSubject,
      body_html: formBody,
      trigger_type: formTrigger,
      trigger_days: formDays,
      is_enabled: formEnabled,
      reply_to_email: formReplyTo || null,
      listing_ids: formListingIds.length > 0 ? formListingIds : [],
      recipient_type: formRecipientType,
      recipient_email: formRecipientType === "fixed" ? formRecipientEmail : formRecipientType === "host" ? user?.email || null : null,
      send_if_late: formSendIfLate,
    });
  };

  const handleTestSend = async () => {
    if (!testEmail || !testAutomation) return;
    setSendingTest(true);
    try {
      let testVariables: Record<string, string> = {};

      if (testBookingId && testBookingId !== "sample") {
        // Use real booking data via edge function
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: {
            action: "test",
            subject: testAutomation.subject,
            body_html: testAutomation.body_html,
            test_email: testEmail,
            booking_id: testBookingId,
            reply_to_email: testAutomation.reply_to_email,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: "E-mail de test envoyé !", description: `Envoyé à ${testEmail}` });
        setTestDialogOpen(false);
        return;
      }

      // Fallback: sample data
      DYNAMIC_VARIABLES.forEach((v) => {
        testVariables[v.key] = `[${v.label}]`;
      });
      testVariables.guest_first_name = "Jean";
      testVariables.guest_last_name = "Dupont";
      testVariables.guest_full_name = "Jean Dupont";
      testVariables.guest_email = "jean.dupont@example.com";
      testVariables.guest_civility = "Monsieur";
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
    setTestEmail("castellamare345@gmail.com");
    setTestBookingId("sample");
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

  const getListingNames = (listingIds: string[] | null) => {
    if (!listingIds || listingIds.length === 0) return "Tous les biens";
    if (listingIds.length === listings.length && listings.length > 0) return "Tous les biens";
    const names = listingIds.map((id) => listings.find((l) => l.id === id)?.title).filter(Boolean);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  };

  const toggleListingId = (id: string) => {
    setFormListingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllListings = () => {
    if (formListingIds.length === listings.length) {
      setFormListingIds([]);
    } else {
      setFormListingIds(listings.map((l) => l.id));
    }
  };

  const getBookingLabel = (b: BookingForTest) => {
    const listing = listings.find((l) => l.id === b.listing_id);
    const listingName = listing?.title || "—";
    const tenantPart = b.tenant_name ? ` • ${b.tenant_name}` : "";
    return `${listingName}${tenantPart} — ${b.checkin_date} → ${b.checkout_date}`;
  };

  const moveAutomation = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= automations.length) return;
    const a = automations[index];
    const b = automations[swapIndex];
    await Promise.all([
      updateById("email_automations", a.id, { sort_order: b.sort_order }),
      updateById("email_automations", b.id, { sort_order: a.sort_order }),
    ]);
    queryClient.invalidateQueries({ queryKey: ["email-automations"] });
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">E-mails automatiques</h2>
            <p className="text-sm text-muted-foreground">
              Configurez des e-mails envoyés automatiquement selon des déclencheurs.
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
              <p className="text-sm mb-4">Créez votre premier modèle ou chargez nos modèles pré-configurés.</p>
              <Button variant="outline" onClick={handleLoadDefaults} disabled={loadingDefaults}>
                <Sparkles className="h-4 w-4 mr-2" />
                {loadingDefaults ? "Chargement..." : "Charger les modèles par défaut (9 e-mails)"}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Ordre</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Bien(s)</TableHead>
                    <TableHead>Déclencheur</TableHead>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automations.map((auto, idx) => (
                    <TableRow key={auto.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost" size="icon" className="h-5 w-5"
                            disabled={idx === 0}
                            onClick={() => moveAutomation(idx, "up")}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-5 w-5"
                            disabled={idx === automations.length - 1}
                            onClick={() => moveAutomation(idx, "down")}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{auto.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {getListingNames(auto.listing_ids)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTriggerLabel(auto)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {auto.recipient_type === "fixed" ? auto.recipient_email : auto.recipient_type === "host" ? "Moi-même" : "Locataire"}
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
            {/* Template selector - only for new automations */}
            {!editingAutomation && (
              <div>
                <Label>Partir d'un modèle</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const template = DEFAULT_EMAIL_TEMPLATES[parseInt(value)];
                    if (template) {
                      setFormName(template.name);
                      setFormSubject(template.subject);
                      setFormBody(template.body_html);
                      setFormTrigger(template.trigger_type);
                      setFormDays(template.trigger_days);
                      setFormRecipientType(template.recipient_type);
                      setFormSendIfLate(template.send_if_late);
                      if (template.recipient_type === "host") {
                        setFormRecipientEmail(user?.email || "");
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle pré-configuré…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_EMAIL_TEMPLATES.map((t, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Optionnel — pré-remplit le formulaire que vous pouvez ensuite personnaliser.
                </p>
              </div>
            )}

            <div>
              <Label>Nom de l'automatisation *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Confirmation de réservation"
              />
            </div>

            {/* Listing multi-select */}
            <div>
              <Label>Bien(s) concerné(s)</Label>
              <div className="mt-2 border rounded-md p-3 max-h-[160px] overflow-y-auto space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b mb-1">
                  <Checkbox
                    id="listing-all"
                    checked={formListingIds.length === 0 || formListingIds.length === listings.length}
                    onCheckedChange={() => {
                      if (formListingIds.length === 0 || formListingIds.length === listings.length) {
                        // If currently "all" (empty), keep empty
                        setFormListingIds([]);
                      } else {
                        setFormListingIds([]);
                      }
                    }}
                  />
                  <Label htmlFor="listing-all" className="font-medium cursor-pointer text-sm">
                    Tous les biens
                  </Label>
                </div>
                {listings.map((l) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`listing-${l.id}`}
                      checked={formListingIds.length === 0 || formListingIds.includes(l.id)}
                      onCheckedChange={() => {
                        if (formListingIds.length === 0) {
                          // Was "all", now deselect this one
                          setFormListingIds(listings.filter((x) => x.id !== l.id).map((x) => x.id));
                        } else {
                          toggleListingId(l.id);
                        }
                      }}
                    />
                    <Label htmlFor={`listing-${l.id}`} className="font-normal cursor-pointer text-sm">
                      {l.title}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formListingIds.length === 0
                  ? "Appliqué à tous les biens."
                  : `${formListingIds.length} bien(s) sélectionné(s).`}
              </p>
            </div>

            {/* Recipient */}
            <div>
              <Label>Destinataire de l'e-mail *</Label>
              <RadioGroup value={formRecipientType} onValueChange={setFormRecipientType} className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="tenant" id="recipient-tenant" />
                  <Label htmlFor="recipient-tenant" className="font-normal cursor-pointer">Le locataire de la réservation</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="host" id="recipient-host" />
                  <Label htmlFor="recipient-host" className="font-normal cursor-pointer">Moi-même</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fixed" id="recipient-fixed" />
                  <Label htmlFor="recipient-fixed" className="font-normal cursor-pointer">Une adresse e-mail fixe</Label>
                </div>
              </RadioGroup>
              {formRecipientType === "fixed" && (
                <Input
                  type="email"
                  value={formRecipientEmail}
                  onChange={(e) => setFormRecipientEmail(e.target.value)}
                  placeholder="destinataire@example.com"
                  className="mt-2"
                />
              )}
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
                L'adresse à laquelle le destinataire répondra.
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
                Vous pouvez utiliser les variables dynamiques.
              </p>
            </div>

            <EmailBodyEditor value={formBody} onChange={setFormBody} />

            <DynamicVariablesPanel />

            {showDays && (
              <div className="flex items-center gap-2">
                <Switch checked={formSendIfLate} onCheckedChange={setFormSendIfLate} />
                <Label className="font-normal">Envoyer même en cas de retard</Label>
              </div>
            )}
            {formSendIfLate && showDays && (
              <p className="text-xs text-muted-foreground -mt-2 ml-10">
                Si la date d'envoi prévue est déjà passée (ex : réservation tardive), l'e-mail sera envoyé immédiatement.
              </p>
            )}

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
            <div>
              <Label>Adresse e-mail de test</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="castellamare345@gmail.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                En mode sandbox Resend, les e-mails ne peuvent être envoyés qu'à l'adresse du propriétaire du compte.
              </p>
            </div>

            <div>
              <Label>Données de test</Label>
              <Select value={testBookingId} onValueChange={setTestBookingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une source de données" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sample">Données d'exemple fictives</SelectItem>
                  {recentBookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {getBookingLabel(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choisissez une réservation existante pour tester les variables dynamiques avec de vraies données.
              </p>
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
