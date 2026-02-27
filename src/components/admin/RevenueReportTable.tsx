import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { WeeklyRevenueReport } from "./types/reports";
import { exportBookingsToCSV } from "@/lib/exportUtils";

interface RevenueReportTableProps {
  reports: WeeklyRevenueReport[];
  loading: boolean;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

export default function RevenueReportTable({ reports, loading }: RevenueReportTableProps) {
  const [exportingWeek, setExportingWeek] = useState<string | null>(null);

  const handleExportWeek = async (weekStart: string, weekEnd: string) => {
    setExportingWeek(weekStart);
    try {
      const result = await exportBookingsToCSV(weekStart, weekEnd);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Report exported successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to export report",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report. Please try again",
        variant: "destructive",
      });
    } finally {
      setExportingWeek(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden p-6">
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="font-semibold">Date Range</TableHead>
            <TableHead className="text-right font-semibold">Bookings</TableHead>
            <TableHead className="text-right font-semibold">Gross Revenue</TableHead>
            <TableHead className="text-right font-semibold">Refunds</TableHead>
            <TableHead className="text-right font-semibold">Host Payouts</TableHead>
            <TableHead className="text-right font-semibold">Net Revenue</TableHead>
            <TableHead className="text-right font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:nth-child(even)]:bg-[#F8FAFF]">
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <p className="text-muted-foreground">No revenue data found</p>
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report) => (
              <TableRow key={report.week_start}>
                <TableCell className="font-medium">{report.week_label}</TableCell>
                <TableCell className="text-right">{report.bookings_count}</TableCell>
                <TableCell className="text-right">{formatCurrency(report.gross_revenue)}</TableCell>
                <TableCell className="text-right text-destructive">
                  {formatCurrency(report.refunds_amount)}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  {formatCurrency(report.host_payouts_amount)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(report.net_revenue)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportWeek(report.week_start, report.week_end)}
                    disabled={exportingWeek === report.week_start}
                    className="min-w-[120px]"
                  >
                    {exportingWeek === report.week_start ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
