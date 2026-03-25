import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Loader2, Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ContractTemplateEditor } from "./ContractTemplateEditor";
import { ContractGenerateDialog } from "./ContractGenerateDialog";
import { ContractPreviewDialog } from "./ContractPreviewDialog";

interface Template {
  id: string;
  name: string;
  body_html: string;
  created_at: string;
}

interface BookingContract {
  id: string;
  booking_id: string;
  template_id: string | null;
  generated_html: string;
  signed_at: string | null;
  signature_data: string | null;
  created_at: string;
  booking_guest_name?: string;
  booking_listing_title?: string;
  booking_checkin?: string;
  booking_checkout?: string;
}

const HostContracts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contracts, setContracts] = useState<BookingContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewContract, setPreviewContract] = useState<BookingContract | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [tRes, cRes] = await Promise.all([
      supabase.from("contract_templates").select("*").eq("host_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("booking_contracts").select("*, bookings(checkin_date, checkout_date, guest_user_id, listings(title))").order("created_at", { ascending: false }),
    ]);
    if (tRes.data) setTemplates(tRes.data as Template[]);
    if (cRes.data) {
      const contractItems = cRes.data as any[];
      // Fetch guest profiles
      const guestIds = [...new Set(contractItems.map((c: any) => c.bookings?.guest_user_id).filter(Boolean))];
      let profileMap = new Map();
      if (guestIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", guestIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      }
      const enriched = contractItems.map((c: any) => {
        const booking = c.bookings;
        const guest = booking ? profileMap.get(booking.guest_user_id) : null;
        return {
          ...c,
          booking_guest_name: guest ? `${guest.first_name || ""} ${guest.last_name || ""}`.trim() : null,
          booking_listing_title: booking?.listings?.title || null,
          booking_checkin: booking?.checkin_date || null,
          booking_checkout: booking?.checkout_date || null,
        } as BookingContract;
      });
      setContracts(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase.from("contract_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template supprimé" });
      fetchData();
    }
  };

  const handleDeleteContract = async (id: string) => {
    const { error } = await supabase.from("booking_contracts").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contrat supprimé" });
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (creatingTemplate || editingTemplate) {
    return (
      <ContractTemplateEditor
        template={editingTemplate}
        onSave={() => {
          setCreatingTemplate(false);
          setEditingTemplate(null);
          fetchData();
        }}
        onCancel={() => {
          setCreatingTemplate(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="contracts">Contrats générés</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreatingTemplate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau template
            </Button>
          </div>
          {templates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Aucun template. Créez votre premier modèle de contrat.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Créé le {format(new Date(t.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setGenerateOpen(true)} disabled={templates.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Générer un contrat
            </Button>
          </div>
          {contracts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Aucun contrat généré pour le moment.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contracts.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">
                          Contrat — {format(new Date(c.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Réservation : {c.booking_id.slice(0, 8)}...
                        </p>
                      </div>
                      {c.signed_at ? (
                        <Badge className="bg-primary/10 text-primary border-0">Signé</Badge>
                      ) : (
                        <Badge variant="secondary">En attente</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewContract(c)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteContract(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ContractGenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        templates={templates}
        onGenerated={fetchData}
      />

      {previewContract && (
        <ContractPreviewDialog
          open={!!previewContract}
          onOpenChange={(open) => !open && setPreviewContract(null)}
          contract={previewContract}
        />
      )}
    </div>
  );
};

export default HostContracts;
