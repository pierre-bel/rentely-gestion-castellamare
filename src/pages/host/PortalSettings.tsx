import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Eye, EyeOff, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HostPageHeader } from "@/components/host/HostPageHeader";

interface PortalSettingsData {
  welcome_message: string | null;
  show_price: boolean;
  show_address: boolean;
  show_house_rules: boolean;
  show_access_code: boolean;
  show_payment_schedule: boolean;
  show_amenities: boolean;
  show_map_link: boolean;
  custom_footer_text: string | null;
}

const DEFAULT_SETTINGS: PortalSettingsData = {
  welcome_message: null,
  show_price: true,
  show_address: true,
  show_house_rules: true,
  show_access_code: true,
  show_payment_schedule: true,
  show_amenities: true,
  show_map_link: true,
  custom_footer_text: null,
};

export default function PortalSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PortalSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("portal_settings")
        .select("*")
        .eq("host_user_id", user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          welcome_message: data.welcome_message,
          show_price: data.show_price,
          show_address: data.show_address,
          show_house_rules: data.show_house_rules,
          show_access_code: data.show_access_code,
          show_payment_schedule: data.show_payment_schedule,
          show_amenities: data.show_amenities,
          show_map_link: data.show_map_link,
          custom_footer_text: data.custom_footer_text,
        });
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    const { error } = await supabase
      .from("portal_settings")
      .upsert(
        {
          host_user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "host_user_id" }
      );

    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder les paramètres." });
    } else {
      toast({ title: "Paramètres sauvegardés", description: "Vos préférences de portail client ont été mises à jour." });
    }
  };

  const toggleSections: { key: keyof PortalSettingsData; label: string; description: string }[] = [
    { key: "show_price", label: "Tarification", description: "Afficher le détail des prix et le total" },
    { key: "show_address", label: "Adresse complète", description: "Afficher l'adresse du bien" },
    { key: "show_map_link", label: "Lien Google Maps", description: "Afficher le lien pour ouvrir l'adresse dans Google Maps" },
    { key: "show_house_rules", label: "Règles de la maison", description: "Afficher le règlement intérieur" },
    { key: "show_access_code", label: "Code d'accès", description: "Afficher le code d'accès Igloohome" },
    { key: "show_payment_schedule", label: "Échéancier de paiement", description: "Afficher les échéances de paiement" },
    { key: "show_amenities", label: "Équipements", description: "Afficher les infos du logement (chambres, lits, sdb)" },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 pb-8 lg:px-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-8 lg:px-8">
      <HostPageHeader
        title="Portail client"
        subtitle="Personnalisez l'apparence et le contenu du portail partagé avec vos locataires"
      />

      <div className="max-w-2xl space-y-6">
        {/* Welcome message */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Message d'accueil
            </CardTitle>
            <CardDescription>
              Un message personnalisé affiché en haut du portail pour vos locataires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Bienvenue ! Nous sommes ravis de vous accueillir..."
              value={settings.welcome_message || ""}
              onChange={(e) => setSettings((s) => ({ ...s, welcome_message: e.target.value || null }))}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Toggle sections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Sections visibles
            </CardTitle>
            <CardDescription>
              Choisissez quelles informations afficher sur le portail client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {toggleSections.map((section, i) => (
              <div key={section.key}>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <Label className="text-sm font-medium">{section.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                  </div>
                  <Switch
                    checked={settings[section.key] as boolean}
                    onCheckedChange={(checked) =>
                      setSettings((s) => ({ ...s, [section.key]: checked }))
                    }
                  />
                </div>
                {i < toggleSections.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Custom footer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-primary" />
              Pied de page personnalisé
            </CardTitle>
            <CardDescription>
              Remplacez le texte en bas du portail par un message personnalisé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ce portail est réservé au locataire de cette réservation."
              value={settings.custom_footer_text || ""}
              onChange={(e) => setSettings((s) => ({ ...s, custom_footer_text: e.target.value || null }))}
              rows={2}
            />
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}
