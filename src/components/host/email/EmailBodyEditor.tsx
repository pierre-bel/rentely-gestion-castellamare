import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Code } from "lucide-react";

interface EmailBodyEditorProps {
  value: string;
  onChange: (html: string) => void;
}

function plainTextToHtml(text: string): string {
  // Convert plain text to styled HTML email
  const lines = text.split("\n");
  const htmlLines = lines.map((line) => {
    if (!line.trim()) return "<br/>";
    // Detect heading lines (lines starting with #)
    if (line.startsWith("### ")) return `<h4 style="margin:12px 0 4px;color:#1a1a1a;">${escapeHtml(line.slice(4))}</h4>`;
    if (line.startsWith("## ")) return `<h3 style="margin:16px 0 4px;color:#1a1a1a;">${escapeHtml(line.slice(3))}</h3>`;
    if (line.startsWith("# ")) return `<h2 style="margin:20px 0 6px;color:#1a1a1a;">${escapeHtml(line.slice(2))}</h2>`;
    // Bold: **text**
    let processed = escapeHtml(line);
    processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    processed = processed.replace(/\*(.+?)\*/g, "<em>$1</em>");
    return `<p style="margin:0 0 8px;line-height:1.6;color:#333;">${processed}</p>`;
  });

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
${htmlLines.join("\n")}
</div>`;
}

function htmlToPlainText(html: string): string {
  // Try to extract text content from HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Preserve {{variables}}
    .replace(/\{\{(\w+)\}\}/g, "{{$1}}");
}

// Re-inject variable placeholders that were escaped
function restoreVariables(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, "{{$1}}");
}

const PLACEHOLDER_TEXT = `# Confirmation de réservation

Bonjour **{{guest_first_name}}**,

Votre réservation pour **{{listing_title}}** est confirmée !

## Détails du séjour

**Arrivée :** {{checkin_date}}
**Départ :** {{checkout_date}}
**Nombre de nuits :** {{nights}}
**Nombre de voyageurs :** {{guests_count}}
**Total :** {{total_price}}

## Adresse

{{listing_address}}, {{listing_city}}, {{listing_country}}

À très bientôt !`;

export default function EmailBodyEditor({ value, onChange }: EmailBodyEditorProps) {
  // Determine if the current value looks like raw HTML or plain text
  const isHtml = value.trim().startsWith("<");
  const [plainText, setPlainText] = useState(() => {
    if (!value) return "";
    if (isHtml) return htmlToPlainText(value);
    return value;
  });
  const [mode, setMode] = useState<"write" | "html">("write");

  const generatedHtml = plainTextToHtml(plainText);

  const handleTextChange = (text: string) => {
    setPlainText(text);
    onChange(plainTextToHtml(text));
  };

  const handleHtmlChange = (html: string) => {
    onChange(html);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Corps de l'e-mail *</Label>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "write" | "html")} className="h-auto">
          <TabsList className="h-8">
            <TabsTrigger value="write" className="text-xs h-7 px-3">Éditeur</TabsTrigger>
            <TabsTrigger value="html" className="text-xs h-7 px-3">
              <Code className="h-3 w-3 mr-1" />
              HTML
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === "write" ? (
        <Textarea
          value={plainText}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={10}
          className="text-sm"
          placeholder={PLACEHOLDER_TEXT}
        />
      ) : (
        <Textarea
          value={value || generatedHtml}
          onChange={(e) => handleHtmlChange(e.target.value)}
          rows={10}
          className="font-mono text-xs"
          placeholder="<div>...</div>"
        />
      )}

      <p className="text-xs text-muted-foreground">
        {mode === "write"
          ? "Utilisez **gras**, *italique*, et # pour les titres. Les variables {{...}} seront remplacées automatiquement."
          : "Mode avancé : modifiez directement le HTML de l'e-mail."}
      </p>

      {/* Live Preview */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm text-muted-foreground">Aperçu</Label>
        </div>
        <div
          className="border rounded-lg p-4 bg-white max-h-[300px] overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: restoreVariables(mode === "write" ? generatedHtml : (value || "")) }}
        />
      </div>
    </div>
  );
}
