import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Copy, Check, RefreshCw, CalendarPlus, ClipboardPaste } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PasteMessagePanelProps {
  hostId: string;
  onCreateBooking: (text: string) => void;
  extractingBooking: boolean;
}

export const PasteMessagePanel = ({ hostId, onCreateBooking, extractingBooking }: PasteMessagePanelProps) => {
  const [pastedText, setPastedText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [specificInstructions, setSpecificInstructions] = useState("");
  const { toast } = useToast();

  const handleGenerateReply = async () => {
    if (!pastedText.trim()) {
      toast({ title: "Erreur", description: "Collez d'abord un message", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-email-reply", {
        body: {
          rawText: pastedText,
          specificInstructions: specificInstructions.trim() || undefined,
          hostId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraftText(data.draft || "");
      setShowDraft(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Impossible de générer la réponse", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copié" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Paste area */}
      <div className="p-3 sm:p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Coller un message</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Collez un message reçu (WhatsApp, plateforme, etc.) pour générer une réponse IA ou créer une réservation.
        </p>
        <Textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Collez le message ici..."
          className="min-h-[150px] sm:min-h-[200px] text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="p-3 sm:p-4 border-b border-border space-y-2">
        <Textarea
          value={specificInstructions}
          onChange={(e) => setSpecificInstructions(e.target.value)}
          placeholder="Instructions spécifiques (optionnel)"
          className="min-h-[50px] resize-none text-xs sm:text-sm"
          rows={2}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateReply}
            disabled={aiLoading || !pastedText.trim()}
            className="gap-1.5 text-xs sm:text-sm flex-1"
            size="sm"
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : showDraft ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {aiLoading ? "Analyse…" : showDraft ? "Regénérer" : "Générer réponse IA"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreateBooking(pastedText)}
            disabled={extractingBooking || !pastedText.trim()}
            className="gap-1.5 text-xs sm:text-sm"
          >
            {extractingBooking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarPlus className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{extractingBooking ? "Extraction…" : "Réservation"}</span>
          </Button>
        </div>
      </div>

      {/* Draft */}
      {showDraft && (
        <div className="flex-1 flex flex-col p-3 sm:p-4 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Réponse générée
            </h4>
            <Button onClick={handleCopy} size="sm" variant="outline" className="gap-1 text-xs h-7">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
          <Textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            className="flex-1 resize-none text-sm"
            placeholder="La réponse générée apparaîtra ici…"
          />
        </div>
      )}
    </div>
  );
};
