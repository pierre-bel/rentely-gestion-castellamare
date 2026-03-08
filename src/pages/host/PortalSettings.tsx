import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Eye, Globe, GripVertical, Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HostPageHeader } from "@/components/host/HostPageHeader";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  section_order: string[];
  require_full_payment_for_access_code: boolean;
}

interface CustomSection {
  id: string;
  section_key: string;
  title: string;
  body_html: string;
  sort_order: number;
  is_enabled: boolean;
}

const DEFAULT_SECTION_ORDER = [
  "dates", "access_code", "address", "amenities", "pricing", "payment_schedule", "house_rules",
];

const BUILTIN_SECTION_LABELS: Record<string, string> = {
  dates: "Dates & voyageurs",
  access_code: "Code d'accès",
  address: "Adresse",
  amenities: "Le logement",
  pricing: "Tarification",
  payment_schedule: "Échéancier de paiement",
  house_rules: "Règles de la maison",
  
};

const BUILTIN_TOGGLE_KEYS: Record<string, keyof PortalSettingsData> = {
  pricing: "show_price",
  address: "show_address",
  house_rules: "show_house_rules",
  access_code: "show_access_code",
  payment_schedule: "show_payment_schedule",
  amenities: "show_amenities",
};

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
  section_order: DEFAULT_SECTION_ORDER,
  require_full_payment_for_access_code: true,
};

// Sortable item component
function SortableSection({
  id,
  label,
  isEnabled,
  isCustom,
  onToggle,
  onEdit,
  onDelete,
}: {
  id: string;
  label: string;
  isEnabled?: boolean;
  isCustom?: boolean;
  onToggle?: (checked: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between py-3 px-3 rounded-lg border border-border bg-card"
    >
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{label}</span>
        {isCustom && (
          <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">Personnalisé</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isCustom && onEdit && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {isCustom && onDelete && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {onToggle !== undefined && isEnabled !== undefined && (
          <Switch checked={isEnabled} onCheckedChange={onToggle} />
        )}
      </div>
    </div>
  );
}

export default function PortalSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PortalSettingsData>(DEFAULT_SETTINGS);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CustomSection | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [previewBookings, setPreviewBookings] = useState<{ id: string; title: string; token: string; guestName: string; checkin: string; checkout: string }[]>([]);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [settingsRes, sectionsRes] = await Promise.all([
        supabase.from("portal_settings").select("*").eq("host_user_id", user.id).maybeSingle(),
        supabase.from("portal_custom_sections").select("*").eq("host_user_id", user.id).order("sort_order"),
      ]);

      if (settingsRes.data) {
        const d = settingsRes.data as any;
        setSettings({
          welcome_message: d.welcome_message,
          show_price: d.show_price,
          show_address: d.show_address,
          show_house_rules: d.show_house_rules,
          show_access_code: d.show_access_code,
          show_payment_schedule: d.show_payment_schedule,
          show_amenities: d.show_amenities,
          show_map_link: d.show_map_link,
          custom_footer_text: d.custom_footer_text,
          section_order: d.section_order || DEFAULT_SECTION_ORDER,
          require_full_payment_for_access_code: d.require_full_payment_for_access_code ?? true,
        });
      }

      if (sectionsRes.data) {
        setCustomSections(sectionsRes.data as CustomSection[]);
      }

      setLoading(false);
    })();
  }, [user?.id]);

  // Ensure section_order includes all custom sections
  const allSectionKeys = [
    ...settings.section_order,
    ...customSections
      .filter((cs) => !settings.section_order.includes(`custom_${cs.section_key}`))
      .map((cs) => `custom_${cs.section_key}`),
  ];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = allSectionKeys.indexOf(active.id as string);
    const newIndex = allSectionKeys.indexOf(over.id as string);
    const newOrder = arrayMove(allSectionKeys, oldIndex, newIndex);
    setSettings((s) => ({ ...s, section_order: newOrder }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    // Save settings
    const { error } = await supabase
      .from("portal_settings")
      .upsert(
        {
          host_user_id: user.id,
          welcome_message: settings.welcome_message,
          show_price: settings.show_price,
          show_address: settings.show_address,
          show_house_rules: settings.show_house_rules,
          show_access_code: settings.show_access_code,
          show_payment_schedule: settings.show_payment_schedule,
          show_amenities: settings.show_amenities,
          show_map_link: settings.show_map_link,
          custom_footer_text: settings.custom_footer_text,
          section_order: settings.section_order as any,
          require_full_payment_for_access_code: settings.require_full_payment_for_access_code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "host_user_id" }
      );

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
    } else {
      toast({ title: "Sauvegardé", description: "Vos paramètres de portail ont été mis à jour." });
    }
  };

  const handleAddCustomSection = async () => {
    if (!user?.id || !newTitle.trim()) return;

    if (editingSection) {
      // Update
      const { error } = await supabase
        .from("portal_custom_sections")
        .update({ title: newTitle, body_html: newBody, updated_at: new Date().toISOString() })
        .eq("id", editingSection.id);

      if (!error) {
        setCustomSections((prev) =>
          prev.map((cs) => (cs.id === editingSection.id ? { ...cs, title: newTitle, body_html: newBody } : cs))
        );
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from("portal_custom_sections")
        .insert({
          host_user_id: user.id,
          title: newTitle,
          body_html: newBody,
          sort_order: customSections.length,
        })
        .select()
        .single();

      if (!error && data) {
        const cs = data as CustomSection;
        setCustomSections((prev) => [...prev, cs]);
        // Add to section order
        setSettings((s) => ({
          ...s,
          section_order: [...s.section_order, `custom_${cs.section_key}`],
        }));
      }
    }

    setCustomDialogOpen(false);
    setEditingSection(null);
    setNewTitle("");
    setNewBody("");
  };

  const handleDeleteCustomSection = async (cs: CustomSection) => {
    await supabase.from("portal_custom_sections").delete().eq("id", cs.id);
    setCustomSections((prev) => prev.filter((s) => s.id !== cs.id));
    setSettings((s) => ({
      ...s,
      section_order: s.section_order.filter((k) => k !== `custom_${cs.section_key}`),
    }));
  };

  const handlePreview = async () => {
    if (!user?.id) return;
    // Fetch bookings with access_token
    const { data } = await supabase
      .from("bookings")
      .select("id, access_token, checkin_date, checkout_date, pricing_breakdown, listings!inner(title, host_user_id), profiles:guest_user_id(first_name, last_name)")
      .eq("listings.host_user_id", user.id)
      .limit(20)
      .order("checkin_date", { ascending: false });

    if (data && data.length > 0) {
      const items = data
        .filter((b: any) => b.listings)
        .map((b: any) => {
          const profile = b.profiles as any;
          const bd = b.pricing_breakdown as any;
          const tenantName = bd?.tenant_name || (profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") : null);
          return {
            id: b.id,
            title: (b.listings as any)?.title || "Réservation",
            token: b.access_token,
            guestName: tenantName || "—",
            checkin: b.checkin_date,
            checkout: b.checkout_date,
          };
        });
      setPreviewBookings(items);
      if (items.length === 1) {
        window.open(`/portal/${items[0].token}`, "_blank");
      } else if (items.length > 0) {
        setPreviewDialogOpen(true);
      } else {
        toast({ title: "Aucune réservation", description: "Créez une réservation pour prévisualiser le portail." });
      }
    } else {
      toast({ title: "Aucune réservation", description: "Créez une réservation pour prévisualiser le portail." });
    }
  };

  const getToggleForSection = (key: string): boolean | undefined => {
    const toggleKey = BUILTIN_TOGGLE_KEYS[key];
    if (!toggleKey) return undefined;
    return settings[toggleKey] as boolean;
  };

  const handleToggleSection = (key: string, checked: boolean) => {
    const toggleKey = BUILTIN_TOGGLE_KEYS[key];
    if (toggleKey) {
      setSettings((s) => ({ ...s, [toggleKey]: checked }));
    }
  };

  const handleToggleCustomSection = (cs: CustomSection, checked: boolean) => {
    supabase
      .from("portal_custom_sections")
      .update({ is_enabled: checked })
      .eq("id", cs.id)
      .then(() => {
        setCustomSections((prev) => prev.map((s) => (s.id === cs.id ? { ...s, is_enabled: checked } : s)));
      });
  };

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
      <HostPageHeader title="Portail client" />
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        Personnalisez l'apparence, l'ordre et le contenu du portail partagé avec vos locataires
      </p>

      <div className="max-w-2xl space-y-6">
        {/* Welcome message */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Message d'accueil
            </CardTitle>
            <CardDescription>Un message personnalisé affiché en haut du portail</CardDescription>
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

        {/* Section order + toggles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  Sections du portail
                </CardTitle>
                <CardDescription className="mt-1">Réorganisez par glisser-déposer et activez/désactivez</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditingSection(null);
                  setNewTitle("");
                  setNewBody("");
                  setCustomDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Section personnalisée
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={allSectionKeys} strategy={verticalListSortingStrategy}>
                {allSectionKeys.map((key) => {
                  const isCustom = key.startsWith("custom_");
                  if (isCustom) {
                    const sectionKey = key.replace("custom_", "");
                    const cs = customSections.find((s) => s.section_key === sectionKey);
                    if (!cs) return null;
                    return (
                      <SortableSection
                        key={key}
                        id={key}
                        label={cs.title}
                        isCustom
                        isEnabled={cs.is_enabled}
                        onToggle={(checked) => handleToggleCustomSection(cs, checked)}
                        onEdit={() => {
                          setEditingSection(cs);
                          setNewTitle(cs.title);
                          setNewBody(cs.body_html);
                          setCustomDialogOpen(true);
                        }}
                        onDelete={() => handleDeleteCustomSection(cs)}
                      />
                    );
                  }

                  const label = BUILTIN_SECTION_LABELS[key] || key;
                  const toggleVal = getToggleForSection(key);
                  return (
                    <SortableSection
                      key={key}
                      id={key}
                      label={label}
                      isEnabled={toggleVal}
                      onToggle={toggleVal !== undefined ? (checked) => handleToggleSection(key, checked) : undefined}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>

            {/* Map link sub-toggle */}
            <div className="flex items-center justify-between py-2 px-3 ml-6 border-l-2 border-border">
              <div>
                <Label className="text-sm">Lien Google Maps</Label>
                <p className="text-xs text-muted-foreground">Affiché dans la section Adresse</p>
              </div>
              <Switch
                checked={settings.show_map_link}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, show_map_link: checked }))}
              />
            </div>

            {/* Access code payment condition sub-toggle */}
            <div className="flex items-center justify-between py-2 px-3 ml-6 border-l-2 border-border">
              <div>
                <Label className="text-sm">Code d'accès conditionné au paiement</Label>
                <p className="text-xs text-muted-foreground">Le code n'est visible que si toutes les échéances sont payées</p>
              </div>
              <Switch
                checked={settings.require_full_payment_for_access_code}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, require_full_payment_for_access_code: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom footer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pied de page personnalisé</CardTitle>
            <CardDescription>Texte affiché en bas du portail</CardDescription>
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

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Sauvegarder
          </Button>
          <Button variant="outline" className="gap-2" onClick={handlePreview}>
            <ExternalLink className="h-4 w-4" />
            Aperçu
          </Button>
        </div>
      </div>

      {/* Custom section dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Modifier la section" : "Nouvelle section personnalisée"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre</Label>
              <Input
                placeholder="Ex: Recommandations locales"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Contenu</Label>
              <Textarea
                placeholder={"Écrivez le contenu qui sera affiché sur le portail...\n\nCollez un lien YouTube ou Vimeo sur une ligne seule pour intégrer une vidéo."}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={6}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">💡 Les liens YouTube et Vimeo collés seuls sur une ligne seront automatiquement intégrés en vidéo.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddCustomSection} disabled={!newTitle.trim()}>
              {editingSection ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview booking selector */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir une réservation pour l'aperçu</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {previewBookings.map((b) => (
              <button
                key={b.id}
                className="w-full text-left px-3 py-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                onClick={() => {
                  window.open(`/portal/${b.token}`, "_blank");
                  setPreviewDialogOpen(false);
                }}
              >
                <p className="text-sm font-medium">{b.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{b.guestName}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(b.checkin), "dd MMM", { locale: fr })} → {format(new Date(b.checkout), "dd MMM yyyy", { locale: fr })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
