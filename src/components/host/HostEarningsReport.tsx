import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import EarningsReportTable from "./EarningsReportTable";
import EarningsReportFiltersSheet from "./EarningsReportFiltersSheet";
import EarningsSummaryCards from "./EarningsSummaryCards";
import type { HostEarningsReport } from "./types/earnings";
import { subMonths, startOfMonth, addMonths } from "date-fns";

const HostEarningsReport = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Default to last 12 months including current month
  const defaultEndMonth = startOfMonth(addMonths(new Date(), 1)); // Start of next month to include current month
  const defaultStartMonth = startOfMonth(subMonths(defaultEndMonth, 12));

  const [startMonth, setStartMonth] = useState<Date | null>(defaultStartMonth);
  const [endMonth, setEndMonth] = useState<Date | null>(defaultEndMonth);
  const [minGross, setMinGross] = useState("");
  const [maxGross, setMaxGross] = useState("");
  const [minNet, setMinNet] = useState("");
  const [maxNet, setMaxNet] = useState("");
  const [sortBy, setSortBy] = useState("month_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: [
      "host-earnings-report",
      user?.id,
      debouncedSearch,
      startMonth?.toISOString(),
      endMonth?.toISOString(),
      minGross,
      maxGross,
      minNet,
      maxNet,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      if (!user?.id || !startMonth || !endMonth) return [];

      const { data, error } = await supabase.rpc("get_host_earnings_report", {
        p_host_user_id: user.id,
        p_start_month: startMonth.toISOString().split("T")[0],
        p_end_month: endMonth.toISOString().split("T")[0],
        p_search_query: debouncedSearch || null,
        p_listing_ids: null,
        p_min_gross: minGross ? parseFloat(minGross) : null,
        p_max_gross: maxGross ? parseFloat(maxGross) : null,
        p_min_net: minNet ? parseFloat(minNet) : null,
        p_max_net: maxNet ? parseFloat(maxNet) : null,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
      });

      if (error) throw error;
      return data as unknown as HostEarningsReport[];
    },
    enabled: !!user?.id && !!startMonth && !!endMonth,
  });

  // Calculate summary data from reports
  const summaryData = useMemo(() => {
    if (!reports || reports.length === 0) {
      return {
        totalGrossRevenue: 0,
        averageRate: 0,
        actualNetRevenue: 0,
        occupancyRate: 0,
      };
    }

    const totalGrossRevenue = reports.reduce(
      (sum, r) => sum + Number(r.gross_earnings),
      0
    );

    const totalPlatformFees = reports.reduce(
      (sum, r) => sum + Number(r.platform_fees),
      0
    );

    const totalCancellationIncome = reports.reduce(
      (sum, r) => sum + Number(r.cancellation_income),
      0
    );

    const totalDisputeIncome = reports.reduce(
      (sum, r) => sum + Number(r.dispute_income),
      0
    );

    const totalDisputeRefunds = reports.reduce(
      (sum, r) => sum + Number(r.dispute_refunds),
      0
    );

    const actualNetRevenue = reports.reduce(
      (sum, r) => sum + Number(r.actual_net_earnings),
      0
    );

    // Calculate true period occupancy
    const totalNights = reports.reduce(
      (sum, r) => sum + Number(r.nights_booked),
      0
    );

    // Calculate weighted average rate (weighted by nights booked)
    const weightedRate = reports.reduce(
      (sum, r) =>
        sum + Number(r.average_nightly_rate) * Number(r.nights_booked),
      0
    );

    const averageRate = totalNights > 0 ? weightedRate / totalNights : 0;

    // Calculate weighted average occupancy (weighted by nights booked)
    const weightedOccupancy = reports.reduce(
      (sum, r) =>
        sum + Number(r.occupancy_percentage) * Number(r.nights_booked),
      0
    );

    const occupancyRate = totalNights > 0 ? weightedOccupancy / totalNights : 0;

    return {
      totalGrossRevenue,
      averageRate,
      actualNetRevenue,
      occupancyRate,
    };
  }, [reports]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    // Count month range as 1 filter if it's different from default
    const isDefaultRange =
      startMonth?.getTime() === defaultStartMonth.getTime() &&
      endMonth?.getTime() === defaultEndMonth.getTime();
    if (!isDefaultRange) count++;

    if (minGross) count++;
    if (maxGross) count++;
    if (minNet) count++;
    if (maxNet) count++;

    return count;
  }, [startMonth, endMonth, minGross, maxGross, minNet, maxNet, defaultStartMonth, defaultEndMonth]);

  const handleApplyFilters = (filters: {
    startMonth: Date | null;
    endMonth: Date | null;
    minGross: string;
    maxGross: string;
    minNet: string;
    maxNet: string;
  }) => {
    setStartMonth(filters.startMonth);
    setEndMonth(filters.endMonth);
    setMinGross(filters.minGross);
    setMaxGross(filters.maxGross);
    setMinNet(filters.minNet);
    setMaxNet(filters.maxNet);
  };

  const handleClearFilters = () => {
    setStartMonth(defaultStartMonth);
    setEndMonth(defaultEndMonth);
    setMinGross("");
    setMaxGross("");
    setMinNet("");
    setMaxNet("");
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        {/* Control Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          {/* Search */}
          <div className="w-full sm:w-auto sm:flex-1 max-w-sm">
            <Input
              placeholder="Rechercher par nom d'annonce..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

        {/* Filters and Sort */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
            {activeFilterCount > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 min-w-5 h-5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split("-");
              setSortBy(newSortBy);
              setSortOrder(newSortOrder as "asc" | "desc");
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month_date-desc">Mois (récent)</SelectItem>
              <SelectItem value="month_date-asc">Mois (ancien)</SelectItem>
              <SelectItem value="listing_title-asc">Annonce (A-Z)</SelectItem>
              <SelectItem value="listing_title-desc">Annonce (Z-A)</SelectItem>
              <SelectItem value="gross_earnings-desc">Brut (décroissant)</SelectItem>
              <SelectItem value="gross_earnings-asc">Brut (croissant)</SelectItem>
              <SelectItem value="net_earnings-desc">Net (décroissant)</SelectItem>
              <SelectItem value="net_earnings-asc">Net (croissant)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

        {/* Summary Cards */}
        <EarningsSummaryCards
          totalGrossRevenue={summaryData.totalGrossRevenue}
          averageRate={summaryData.averageRate}
          actualNetRevenue={summaryData.actualNetRevenue}
          occupancyRate={summaryData.occupancyRate}
          isLoading={isLoading}
        />

        {/* Table */}
        <EarningsReportTable reports={reports || []} isLoading={isLoading} />

        {/* Filters Sheet */}
        <EarningsReportFiltersSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          startMonth={startMonth}
          endMonth={endMonth}
          minGross={minGross}
          maxGross={maxGross}
          minNet={minNet}
          maxNet={maxNet}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
      </CardContent>
    </Card>
  );
};

export default HostEarningsReport;
