import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import RevenueReportTable from "./RevenueReportTable";
import RevenueFiltersSheet from "./RevenueFiltersSheet";
import CustomReportDialog from "./CustomReportDialog";
import type { WeeklyRevenueReport } from "./types/reports";

export default function RevenueManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState("week-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customReportDialogOpen, setCustomReportDialogOpen] = useState(false);
  
  // Default to last year
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());

  // Fetch revenue data
  const { data: revenueReports, isLoading } = useQuery({
    queryKey: ["admin-weekly-revenue", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_weekly_revenue_report", {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      });
      if (error) throw error;
      return data as WeeklyRevenueReport[];
    }
  });

  // Filter and sort data
  const processedReports = useMemo(() => {
    if (!revenueReports) return [];

    // Filter by search query
    let filtered = revenueReports.filter(report =>
      report.week_label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortValue) {
        case "week-asc":
          return new Date(a.week_start).getTime() - new Date(b.week_start).getTime();
        case "week-desc":
          return new Date(b.week_start).getTime() - new Date(a.week_start).getTime();
        case "bookings-desc":
          return b.bookings_count - a.bookings_count;
        case "gross-desc":
          return b.gross_revenue - a.gross_revenue;
        case "net-desc":
          return b.net_revenue - a.net_revenue;
        default:
          return 0;
      }
    });

    return filtered;
  }, [revenueReports, searchQuery, sortValue]);

  const handleCreateCustomReport = () => {
    setCustomReportDialogOpen(true);
  };

  const handleApplyFilters = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleClearFilters = () => {
    const today = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(today.getFullYear() - 1);
    setStartDate(lastYear);
    setEndDate(today);
  };

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Search */}
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by date range..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border"
          />
        </div>
        
        {/* Right: Filter, Sort, Create Custom Report */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFiltersOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          <Select value={sortValue} onValueChange={setSortValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week-desc">Latest Week</SelectItem>
              <SelectItem value="week-asc">Oldest Week</SelectItem>
              <SelectItem value="bookings-desc">Most Bookings</SelectItem>
              <SelectItem value="gross-desc">Highest Gross</SelectItem>
              <SelectItem value="net-desc">Highest Net</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleCreateCustomReport}>
            <FileDown className="h-4 w-4 mr-2" />
            Create Custom Report
          </Button>
        </div>
      </div>
      
      {/* Revenue Table */}
      <RevenueReportTable reports={processedReports} loading={isLoading} />
      
      {/* Filters Sheet */}
      <RevenueFiltersSheet
        startDate={startDate}
        endDate={endDate}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      />

      <CustomReportDialog
        open={customReportDialogOpen}
        onOpenChange={setCustomReportDialogOpen}
      />
    </div>
  );
}
