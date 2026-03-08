import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface HostReviewResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingResponse: string | null;
  onSubmit: (response: string) => Promise<void>;
}

export const HostReviewResponseDialog = ({
  open,
  onOpenChange,
  existingResponse,
  onSubmit,
}: HostReviewResponseDialogProps) => {
  const [response, setResponse] = useState(existingResponse || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) return;
    setSaving(true);
    await onSubmit(response.trim());
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existingResponse ? "Modifier la réponse" : "Répondre à l'avis"}
          </DialogTitle>
        </DialogHeader>
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Écrivez votre réponse..."
          rows={5}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !response.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existingResponse ? "Modifier" : "Publier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
