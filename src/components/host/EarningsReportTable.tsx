import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { HostEarningsReport } from "./types/earnings";

interface EarningsReportTableProps {
  reports: HostEarningsReport[];
  isLoading: boolean;
}

const EarningsReportTable = ({ reports, isLoading }: EarningsReportTableProps) => {
  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Annonce</TableHead>
              <TableHead className="font-semibold">Mois</TableHead>
              <TableHead className="font-semibold text-right">Nuits</TableHead>
              <TableHead className="font-semibold text-right">Terminées</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Annul. %</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Occ. %</TableHead>
              <TableHead className="font-semibold text-right">Tarif moy.</TableHead>
              <TableHead className="font-semibold text-right">Brut</TableHead>
              <TableHead className="font-semibold text-right">Frais</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Revenus annulation</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Revenus litiges</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Remb. litiges</TableHead>
              <TableHead className="font-semibold text-right">Net réel</TableHead>
              <TableHead className="font-semibold">Dernier versement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className={i % 2 === 0 ? "bg-[#F8FAFF]" : ""}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">Aucune donnée de revenus pour la période sélectionnée</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(amount));
  };

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Annonce</TableHead>
              <TableHead className="font-semibold">Mois</TableHead>
              <TableHead className="font-semibold text-right">Nuits</TableHead>
              <TableHead className="font-semibold text-right">Terminées</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Annul. %</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Occ. %</TableHead>
              <TableHead className="font-semibold text-right">Tarif moy.</TableHead>
              <TableHead className="font-semibold text-right">Brut</TableHead>
              <TableHead className="font-semibold text-right">Frais</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Revenus annulation</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Revenus litiges</TableHead>
              <TableHead className="font-semibold text-right whitespace-nowrap">Remb. litiges</TableHead>
              <TableHead className="font-semibold text-right">Net réel</TableHead>
              <TableHead className="font-semibold">Dernier versement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report, index) => (
            <TableRow 
              key={`${report.listing_id}-${report.month_date}-${index}`}
              className={index % 2 === 0 ? "bg-[#F8FAFF] hover:bg-muted/50" : "hover:bg-muted/50"}
            >
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{report.listing_title}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">{report.month_year}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm">{report.nights_booked}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm">{report.completed_count}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm">{report.cancel_percentage}%</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm font-medium">{report.occupancy_percentage}%</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm">{formatCurrency(report.average_nightly_rate)}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm font-semibold">{formatCurrency(report.gross_earnings)}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm text-muted-foreground">{formatCurrency(report.platform_fees)}</span>
              </TableCell>
              <TableCell className="text-right">
                {report.cancellation_income > 0 ? (
                  <span className="text-sm font-medium text-green-600">
                    +{formatCurrency(report.cancellation_income)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">0,00 €</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {report.dispute_income > 0 ? (
                  <span className="text-sm font-medium text-green-600">
                    +{formatCurrency(report.dispute_income)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">0,00 €</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {report.dispute_refunds > 0 ? (
                  <span className="text-sm font-medium text-destructive">
                    -{formatCurrency(report.dispute_refunds)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">0,00 €</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm font-semibold text-primary">{formatCurrency(report.actual_net_earnings)}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {report.last_payout_date
                    ? format(new Date(report.last_payout_date), "d MMM yyyy", { locale: fr })
                    : "Non versé"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default EarningsReportTable;
