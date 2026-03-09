import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface PaymentQRCodeProps {
  beneficiary: string;
  iban: string;
  bic: string;
  amount: number;
  reference: string;
  currency?: string;
}

export function buildEpcString({ beneficiary, iban, bic, amount, reference }: PaymentQRCodeProps): string {
  // EPC069-12 standard — remittance info (unstructured, max 140 chars)
  const lines = [
    "BCD",           // Service Tag
    "002",           // Version
    "1",             // Character set (UTF-8)
    "SCT",           // Identification
    bic.replace(/\s/g, "").toUpperCase(),
    beneficiary.substring(0, 70),
    iban.replace(/\s/g, "").toUpperCase(),
    `EUR${amount.toFixed(2)}`,
    "",              // Purpose (empty)
    "",              // Structured reference (empty)
    reference.substring(0, 140), // Unstructured remittance info
  ];
  return lines.join("\n");
}

/** Generate a QR code as a base64 data URL (for embedding in emails/contracts) */
export async function generateQRDataUrl(props: PaymentQRCodeProps): Promise<string> {
  const epcString = buildEpcString(props);
  return QRCode.toDataURL(epcString, { margin: 2, width: 200 });
}

export function PaymentQRCode(props: PaymentQRCodeProps) {
  const [svgData, setSvgData] = useState<string>("");

  useEffect(() => {
    const epcString = buildEpcString(props);
    QRCode.toString(epcString, { type: "svg", margin: 2, width: 200 })
      .then(setSvgData)
      .catch(console.error);
  }, [props.beneficiary, props.iban, props.bic, props.amount, props.reference]);

  if (!svgData) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="QR code de paiement SEPA">
          <QrCode className="h-4 w-4 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 space-y-2" align="end">
        <p className="text-xs font-medium text-center">Scanner pour payer par virement</p>
        <div dangerouslySetInnerHTML={{ __html: svgData }} className="flex justify-center" />
        <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
          Scannez ce QR code avec votre application bancaire pour pré-remplir le virement.
        </p>
      </PopoverContent>
    </Popover>
  );
}

/** Build the reference string from a template and booking data */
export function buildTransferReference(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value || "");
  }
  // EPC unstructured remittance info max 140 chars
  return result.substring(0, 140);
}
