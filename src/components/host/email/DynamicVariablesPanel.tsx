import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const DYNAMIC_VARIABLES = [
  { key: "guest_first_name", label: "Prénom du locataire" },
  { key: "guest_last_name", label: "Nom du locataire" },
  { key: "guest_full_name", label: "Nom complet du locataire" },
  { key: "guest_email", label: "E-mail du locataire" },
  { key: "guest_civility", label: "Civilité (Monsieur/Madame)" },
  { key: "checkin_date", label: "Date d'arrivée" },
  { key: "checkout_date", label: "Date de départ" },
  { key: "nights", label: "Nombre de nuits" },
  { key: "total_price", label: "Prix total" },
  { key: "listing_title", label: "Nom du bien" },
  { key: "listing_address", label: "Adresse du bien" },
  { key: "listing_city", label: "Ville du bien" },
  { key: "listing_country", label: "Pays du bien" },
  { key: "booking_id", label: "ID de réservation" },
];

export default function DynamicVariablesPanel() {
  const { toast } = useToast();

  const copyVariable = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    toast({ title: "Copié !", description: `{{${key}}} copié dans le presse-papier` });
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Variables dynamiques disponibles</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {DYNAMIC_VARIABLES.map((v) => (
          <Tooltip key={v.key}>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => copyVariable(v.key)}
              >
                <Copy className="h-3 w-3 mr-1" />
                {`{{${v.key}}}`}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{v.label} — cliquer pour copier</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
