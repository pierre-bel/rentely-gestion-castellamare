import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: {
    id: string;
    generated_html: string;
    signed_at: string | null;
    signature_data: string | null;
    created_at: string;
  };
}

export const ContractPreviewDialog = ({ open, onOpenChange, contract }: ContractPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Aperçu du contrat</DialogTitle>
            {contract.signed_at ? (
              <Badge className="bg-primary/10 text-primary border-0">
                Signé le {format(new Date(contract.signed_at), "d MMM yyyy", { locale: fr })}
              </Badge>
            ) : (
              <Badge variant="secondary">Non signé</Badge>
            )}
          </div>
        </DialogHeader>
        <div
          className="prose prose-sm max-w-none text-foreground border rounded-lg p-6 bg-card [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted/50 [&_th]:font-semibold"
          dangerouslySetInnerHTML={{ __html: contract.generated_html }}
        />
        {contract.signature_data && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Signature :</p>
            <img src={contract.signature_data} alt="Signature" className="max-h-20" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
