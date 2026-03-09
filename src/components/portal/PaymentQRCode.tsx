import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PaymentQRCodeProps {
  beneficiary: string;
  iban: string;
  bic: string;
  amount: number;
  reference: string;
  currency?: string;
}

function buildEpcString({ beneficiary, iban, bic, amount, reference }: PaymentQRCodeProps): string {
  // EPC069-12 standard
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
    reference.substring(0, 35),
    "",              // Display text (empty)
  ];
  return lines.join("\n");
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
