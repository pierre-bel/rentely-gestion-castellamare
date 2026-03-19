import { useState } from "react";
import DOMPurify from "dompurify";
import { InboxEmail } from "@/hooks/useInboxEmails";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Mail, ArrowLeft, Paperclip, Sparkles, Loader2, Copy, Check, RefreshCw, CalendarPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailDetailPanelProps {
  email: InboxEmail | null;
  onBack?: () => void;
  showBackButton?: boolean;
  onStatusChange?: (emailId: string, status: string) => void;
  onDraftSave?: (emailId: string, draft: string) => void;
  onCreateBooking?: () => void;
  extractingBooking?: boolean;
  onDeleteEmail?: (emailId: string) => void;
}

const statusOptions = [
  { value: "new", label: "Nouveau" },
  { value: "pending", label: "En cours" },
  { value: "handled", label: "Traité" },
];

export const EmailDetailPanel = ({ email, onBack, showBackButton, onStatusChange, onDraftSave, onCreateBooking, extractingBooking, onDeleteEmail }: EmailDetailPanelProps) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [specificInstructions, setSpecificInstructions] = useState("");
  const { toast } = useToast();

  const handleGenerateAiReply = async () => {
    if (!email) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-email-reply", {
        body: { emailId: email.id, specificInstructions: specificInstructions.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const draft = data.draft || "";
      setDraftText(draft);
      setDraftSubject(`Re: ${email.subject || ""}`);
      setShowDraft(true);
      // Save draft to DB
      onDraftSave?.(email.id, draft);
      // Auto-set status to pending
      if (email.status === "new") {
        onStatusChange?.(email.id, "pending");
      }
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de générer la réponse IA",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyDraft = async () => {
    const fullText = `Objet: ${draftSubject}\n\n${draftText}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copié", description: "Le brouillon a été copié dans le presse-papiers" });
  };

  // Load existing draft when email changes
  const loadDraft = () => {
    if (email?.ai_draft) {
      setDraftText(email.ai_draft);
      setDraftSubject(`Re: ${email.subject || ""}`);
      setShowDraft(true);
    } else {
      setDraftText("");
      setDraftSubject("");
      setShowDraft(false);
    }
  };

  // Reset draft when email changes
  useState(() => { loadDraft(); });

  if (!email) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <Mail className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Sélectionnez un email</h3>
        <p className="text-sm text-muted-foreground">Choisissez un email dans la liste pour le lire</p>
      </div>
    );
  }

  const attachments = Array.isArray(email.attachments) ? email.attachments : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Email Content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
            <h2 className="text-sm sm:text-lg font-semibold text-foreground truncate flex-1">
              {email.subject || "(Sans objet)"}
            </h2>
            <Select
              value={email.status || "new"}
              onValueChange={(val) => onStatusChange?.(email.id, val)}
            >
              <SelectTrigger className="w-[100px] sm:w-[120px] h-7 sm:h-8 text-[10px] sm:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onCreateBooking && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateBooking}
                disabled={extractingBooking}
                className="gap-1 sm:gap-1.5 shrink-0 h-7 sm:h-8 text-[10px] sm:text-xs"
              >
                {extractingBooking ? (
                  <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
                ) : (
                  <CalendarPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                )}
                <span className="hidden sm:inline">{extractingBooking ? "Extraction…" : "Réservation"}</span>
              </Button>
            )}
            {onDeleteEmail && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteEmail(email.id)}
                className="shrink-0 h-7 sm:h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm gap-0.5">
            <div className="min-w-0 truncate">
              <span className="font-medium text-foreground">{email.from_name || email.from_email}</span>
              {email.from_name && (
                <span className="text-muted-foreground ml-1 sm:ml-2 hidden sm:inline">&lt;{email.from_email}&gt;</span>
              )}
            </div>
            <span className="text-muted-foreground shrink-0 text-[10px] sm:text-sm">
              {format(new Date(email.received_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
          </div>
          {email.to_email && (
            <p className="text-xs text-muted-foreground mt-1">À : {email.to_email}</p>
          )}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              {attachments.map((att: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {att.filename || att.name || `Pièce jointe ${i + 1}`}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 p-3 sm:p-4">
          {email.body_html ? (
            <div
              className="prose prose-sm max-w-none text-xs sm:text-sm"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body_html) }}
            />
          ) : (
            <pre className="text-xs sm:text-sm text-foreground whitespace-pre-wrap font-sans">
              {email.body_text || "Aucun contenu"}
            </pre>
          )}
        </ScrollArea>
      </div>

      {/* AI Draft Panel - collapsible on mobile */}
      <div className="flex flex-col shrink-0 bg-muted/30 border-t border-border">
        <div className="p-3 sm:p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              Réponse IA
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAiReply}
              disabled={aiLoading}
              className="gap-1 sm:gap-1.5 text-xs sm:text-sm h-7 sm:h-8"
            >
              {aiLoading ? (
                <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
              ) : showDraft ? (
                <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              ) : (
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              )}
              {aiLoading ? "Analyse…" : showDraft ? "Regénérer" : "Générer"}
            </Button>
          </div>
          <Textarea
            value={specificInstructions}
            onChange={(e) => setSpecificInstructions(e.target.value)}
            placeholder="Instructions spécifiques pour ce message (ex: proposer une réduction, mentionner un événement local…)"
            className="min-h-[50px] sm:min-h-[60px] resize-none text-xs sm:text-sm bg-background"
            rows={2}
          />
          {showDraft && (
            <Input
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              placeholder="Objet de la réponse"
              className="h-7 sm:h-8 text-xs sm:text-sm mt-2"
            />
          )}
        </div>

        {showDraft ? (
          <>
            <div className="p-3 sm:p-4 overflow-hidden">
              <Textarea
                value={draftText}
                onChange={(e) => {
                  setDraftText(e.target.value);
                  onDraftSave?.(email.id, e.target.value);
                }}
                className="min-h-[120px] sm:min-h-[200px] resize-none text-xs sm:text-sm bg-background"
                placeholder="Le brouillon apparaîtra ici…"
              />
            </div>
            <div className="p-3 sm:p-4 border-t border-border flex gap-2">
              <Button onClick={handleCopyDraft} className="gap-1 sm:gap-1.5 flex-1 text-xs sm:text-sm h-8" size="sm">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copié !" : "Copier"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange?.(email.id, "handled")}
                className="text-xs sm:text-sm h-8"
              >
                Traité
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center p-4 sm:p-6 text-center">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-0.5">
                Cliquez sur « Générer » pour un brouillon IA
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                basé sur vos disponibilités et tarifs
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
