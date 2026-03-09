import { useState } from "react";
import { InboxEmail } from "@/hooks/useInboxEmails";
import { format } from "date-fns";
import { Mail, ArrowLeft, Paperclip, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailDetailPanelProps {
  email: InboxEmail | null;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const EmailDetailPanel = ({ email, onBack, showBackButton }: EmailDetailPanelProps) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateAiReply = async () => {
    if (!email) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-email-reply", {
        body: { emailId: email.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraftText(data.draft || "");
      setDraftOpen(true);
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
    await navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copié", description: "Le brouillon a été copié dans le presse-papiers" });
  };

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-lg font-semibold text-foreground truncate flex-1">
            {email.subject || "(Sans objet)"}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAiReply}
            disabled={aiLoading}
            className="shrink-0 gap-1.5"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {aiLoading ? "Analyse…" : "Réponse IA"}
          </Button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium text-foreground">{email.from_name || email.from_email}</span>
            {email.from_name && (
              <span className="text-muted-foreground ml-2">&lt;{email.from_email}&gt;</span>
            )}
          </div>
          <span className="text-muted-foreground shrink-0">
            {format(new Date(email.received_at), "dd MMM yyyy à HH:mm")}
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
      <ScrollArea className="flex-1 p-4">
        {email.body_html ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body_html }}
          />
        ) : (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
            {email.body_text || "Aucun contenu"}
          </pre>
        )}
      </ScrollArea>

      {/* AI Draft Dialog */}
      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Brouillon de réponse IA
            </DialogTitle>
            <DialogDescription>
              Relisez et modifiez le brouillon avant de l'envoyer. Copiez-le pour l'utiliser dans votre client email.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="min-h-[300px] h-full resize-none text-sm"
              placeholder="Le brouillon apparaîtra ici…"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDraftOpen(false)}>
              Fermer
            </Button>
            <Button onClick={handleCopyDraft} className="gap-1.5">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier le brouillon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
