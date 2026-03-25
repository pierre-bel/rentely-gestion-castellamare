import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, FileText, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);

  const handleExportPdf = async () => {
    if (!contentRef.current) return;
    setExportingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = position - (pdfHeight - 20);
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      pdf.save(`contrat-${contract.id.slice(0, 8)}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    }
    setExportingPdf(false);
  };

  const handleExportWord = async () => {
    setExportingWord(true);
    try {
      const { asBlob } = await import("html-docx-js-typescript");
      const fullHtml = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #000; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ccc; padding: 6px 8px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          blockquote { border-left: 4px solid #ccc; padding-left: 16px; margin: 12px 0; }
          img { max-width: 200px; }
        </style>
        </head><body>${contract.generated_html}${
          contract.signature_data
            ? `<div style="margin-top:24px;border-top:1px solid #ccc;padding-top:16px"><p style="font-size:11px;color:#666">Signature :</p><img src="${contract.signature_data}" style="max-height:80px" /></div>`
            : ""
        }</body></html>
      `;
      const blob = await asBlob(fullHtml) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrat-${contract.id.slice(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Word export failed", e);
    }
    setExportingWord(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
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

        <div className="flex gap-2 pb-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportWord} disabled={exportingWord}>
            {exportingWord ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Word
          </Button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div
            ref={contentRef}
            className="prose prose-sm max-w-none text-foreground border rounded-lg p-6 bg-white text-black [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_th]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-gray-400 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:bg-gray-50 [&_blockquote]:rounded-r"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contract.generated_html, { ADD_TAGS: ['img'], ADD_ATTR: ['src', 'alt', 'width', 'height', 'style'] }) }}
          />
          {contract.signature_data && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-2">Signature :</p>
              <img src={contract.signature_data} alt="Signature" className="max-h-20" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
