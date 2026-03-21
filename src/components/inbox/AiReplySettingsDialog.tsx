import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AiReplySettingsDialogProps {
  hostId: string;
}

const TONE_OPTIONS = [
  { value: "professionnel et chaleureux", label: "Professionnel & chaleureux" },
  { value: "formel", label: "Formel" },
  { value: "décontracté", label: "Décontracté" },
  { value: "concis et direct", label: "Concis & direct" },
  { value: "amical et enthousiaste", label: "Amical & enthousiaste" },
];

const LANGUAGE_OPTIONS = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "nl", label: "Nederlands" },
  { value: "de", label: "Deutsch" },
  { value: "auto", label: "Auto (même langue que l'email)" },
];

export const AiReplySettingsDialog = ({ hostId }: AiReplySettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customPrompt, setCustomPrompt] = useState("");
  const [tone, setTone] = useState("professionnel et chaleureux");
  const [language, setLanguage] = useState("fr");
  const [signature, setSignature] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [pricingExplanation, setPricingExplanation] = useState("");

  useEffect(() => {
    if (!open) return;
    const fetchSettings = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("host_ai_settings")
        .select("*")
        .eq("host_user_id", hostId)
        .maybeSingle();

      if (data) {
        setCustomPrompt(data.custom_prompt || "");
        setTone(data.tone || "professionnel et chaleureux");
        setLanguage(data.language || "fr");
        setSignature(data.signature || "");
        setAdditionalInstructions(data.additional_instructions || "");
        setPricingExplanation((data as any).pricing_explanation || "");
      }
      setLoading(false);
    };
    fetchSettings();
  }, [open, hostId]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      host_user_id: hostId,
      custom_prompt: customPrompt,
      tone,
      language,
      signature,
      additional_instructions: additionalInstructions,
      pricing_explanation: pricingExplanation,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("host_ai_settings")
      .upsert(payload, { onConflict: "host_user_id" });

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    } else {
      toast.success("Paramètres IA sauvegardés");
      setOpen(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-4 w-4" />
          Paramètres IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paramètres de la réponse IA</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Tone */}
            <div className="space-y-2">
              <Label>Ton de la réponse</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label>Langue de réponse</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom prompt / context */}
            <div className="space-y-2">
              <Label>Contexte général</Label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ex: Je suis propriétaire de locations à la mer. Les draps et serviettes sont fournis. Le ménage de fin de séjour est inclus..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Informations générales que l'IA utilisera pour contextualiser ses réponses.
              </p>
            </div>

            {/* Additional instructions */}
            <div className="space-y-2">
              <Label>Instructions supplémentaires</Label>
              <Textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="Ex: Toujours proposer un appel téléphonique. Ne jamais mentionner les prix avant d'avoir confirmé les dates..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Consignes spécifiques pour guider le comportement de l'IA.
              </p>
            </div>

            {/* Pricing explanation */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">💰 Explication tarif</Label>
              <Textarea
                value={pricingExplanation}
                onChange={(e) => setPricingExplanation(e.target.value)}
                placeholder="Ex: Tarif semaine du samedi au samedi. Week-end = vendredi + samedi soir. Réduction de 10% pour les séjours de 2 semaines ou plus. Frais de ménage de 80€ en supplément..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Décrivez vos règles tarifaires pour que l'IA puisse expliquer correctement vos prix aux clients.
              </p>
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <Label>Signature</Label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Ex: Cordialement, L'équipe Castellamare"
              />
              <p className="text-xs text-muted-foreground">
                Sera ajoutée à la fin de chaque brouillon généré.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
