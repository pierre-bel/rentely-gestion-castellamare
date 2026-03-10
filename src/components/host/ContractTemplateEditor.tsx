import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import ContractToolbar from "./ContractToolbar";

const DYNAMIC_VARIABLES_GROUPS = [
  {
    title: "Locataire",
    vars: [
      { key: "{{guest_name}}", label: "Nom complet" },
      { key: "{{guest_first_name}}", label: "Prénom" },
      { key: "{{guest_last_name}}", label: "Nom" },
      { key: "{{guest_civility}}", label: "Civilité (Monsieur/Madame)" },
      { key: "{{guest_email}}", label: "E-mail" },
      { key: "{{guest_phone}}", label: "Téléphone" },
    ],
  },
  {
    title: "Réservation",
    vars: [
      { key: "{{booking_id}}", label: "ID réservation" },
      { key: "{{checkin_date}}", label: "Date d'arrivée" },
      { key: "{{checkin_time}}", label: "Heure d'arrivée" },
      { key: "{{checkout_date}}", label: "Date de départ" },
      { key: "{{checkout_time}}", label: "Heure de départ" },
      { key: "{{nights}}", label: "Nombre de nuits" },
      { key: "{{guests}}", label: "Nombre de voyageurs" },
      { key: "{{beach_cabin}}", label: "Cabine de plage (masqué si non)" },
    ],
  },
  {
    title: "Logement",
    vars: [
      { key: "{{listing_title}}", label: "Nom du bien" },
      { key: "{{listing_address}}", label: "Adresse" },
      { key: "{{listing_city}}", label: "Ville" },
      { key: "{{listing_country}}", label: "Pays" },
      { key: "{{listing_type}}", label: "Type de bien" },
    ],
  },
  {
    title: "Tarifs & Paiements",
    vars: [
      { key: "{{total_price}}", label: "Prix total TTC" },
      { key: "{{subtotal}}", label: "Sous-total (hors frais)" },
      { key: "{{cleaning_fee}}", label: "Frais de ménage" },
      { key: "{{service_fee}}", label: "Frais de service" },
      { key: "{{taxes}}", label: "Taxes" },
      { key: "{{security_deposit}}", label: "Dépôt de garantie" },
      { key: "{{deposit_amount}}", label: "Montant de l'acompte" },
      { key: "{{deposit_due_date}}", label: "Échéance de l'acompte" },
      { key: "{{deposit_status}}", label: "Statut de l'acompte" },
      { key: "{{balance_amount}}", label: "Montant du solde" },
      { key: "{{balance_due_date}}", label: "Échéance du solde" },
      { key: "{{balance_status}}", label: "Statut du solde" },
      { key: "{{payment_schedule}}", label: "Échéancier complet (tableau)" },
      { key: "{{qr_paiement}}", label: "QR code de paiement SEPA (image)" },
    ],
  },
  {
    title: "Dates",
    vars: [
      { key: "{{today_date}}", label: "Date du jour" },
      { key: "{{booking_created_date}}", label: "Date de réservation" },
    ],
  },
];

interface ContractTemplateEditorProps {
  template: { id: string; name: string; body_html: string } | null;
  onSave: () => void;
  onCancel: () => void;
}

export const ContractTemplateEditor = ({ template, onSave, onCancel }: ContractTemplateEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(template?.name || "");
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: template?.body_html || "<p></p>",
  });

  const insertVariable = (variable: string) => {
    if (editor) {
      editor.chain().focus().insertContent(variable).run();
    }
  };

  const handleSave = async () => {
    if (!user || !name.trim() || !editor) return;
    const bodyHtml = editor.getHTML();
    setSaving(true);

    if (template) {
      const { error } = await supabase
        .from("contract_templates")
        .update({ name: name.trim(), body_html: bodyHtml, updated_at: new Date().toISOString() } as any)
        .eq("id", template.id);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template modifié" });
        onSave();
      }
    } else {
      const { error } = await supabase
        .from("contract_templates")
        .insert({ host_user_id: user.id, name: name.trim(), body_html: bodyHtml } as any);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template créé" });
        onSave();
      }
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold">
          {template ? "Modifier le template" : "Nouveau template"}
        </h2>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          <div>
            <Label>Nom du template</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Contrat de location saisonnière" />
          </div>
          <div>
            <Label>Contenu du contrat</Label>
            <div className="border rounded-lg overflow-hidden mt-1.5">
              <ContractToolbar editor={editor} />
              <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none p-4 min-h-[400px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[380px] [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-muted/50 [&_.ProseMirror_th]:font-semibold"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Utilisez la barre d'outils pour mettre en forme. Les variables {"{{...}}"} seront remplacées automatiquement lors de la génération.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
            <Button variant="outline" onClick={onCancel}>Annuler</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Variables dynamiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Cliquez pour insérer une variable à la position du curseur. Elle sera remplacée automatiquement lors de la génération.
            </p>
            {DYNAMIC_VARIABLES_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{group.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.vars.map((v) => (
                    <Badge
                      key={v.key}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors text-xs"
                      onClick={() => insertVariable(v.key)}
                    >
                      {v.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
