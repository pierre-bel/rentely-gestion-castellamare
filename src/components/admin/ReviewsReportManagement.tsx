import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, FileText } from "lucide-react";
import { subYears } from "date-fns";
import { toast } from "sonner";
import ReviewsReportTable from "./ReviewsReportTable";
import ReviewsReportFiltersSheet from "./ReviewsReportFiltersSheet";
import CustomReviewsReportDialog from "./CustomReviewsReportDialog";
import type { ListingReviewsReport, ReviewsReportFilters } from "./types/reviews-report";

export default function ReviewsReportManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState("total_reviews-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customReportOpen, setCustomReportOpen] = useState(false);
  
  const [filters, setFilters] = useState<ReviewsReportFilters>({
    startDate: subYears(new Date(), 1),
    endDate: new Date(),
    minRating: null,
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["admin-listings-reviews-report", filters.startDate, filters.endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_listings_reviews_report", {
        p_start_date: filters.startDate.toISOString().split("T")[0],
        p_end_date: filters.endDate.toISOString().split("T")[0],
      });

      if (error) throw error;
      return data as ListingReviewsReport[];
    },
  });

  const filteredAndSortedData = useMemo(() => {
    if (!reportData) return [];

    let filtered = [...reportData];

    // Apply search filter (listing name and city)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.listing_title.toLowerCase().includes(query) ||
          row.listing_city.toLowerCase().includes(query)
      );
    }

    // Apply minimum rating filter
    if (filters.minRating !== null) {
      filtered = filtered.filter((row) => row.average_rating >= filters.minRating!);
    }

    // Apply sorting
    const [sortKey, sortOrder] = sortValue.split("-") as [string, "asc" | "desc"];
    
    filtered.sort((a, b) => {
      let aVal: any = a[sortKey as keyof ListingReviewsReport];
      let bVal: any = b[sortKey as keyof ListingReviewsReport];

      // Handle string comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Handle numeric comparison
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [reportData, searchQuery, filters.minRating, sortValue]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.minRating !== null) count++;
    // Date range is always active, so we don't count it unless it's not the default
    const oneYearAgo = subYears(new Date(), 1);
    if (
      filters.startDate.getTime() !== oneYearAgo.getTime() ||
      filters.endDate.toDateString() !== new Date().toDateString()
    ) {
      count++;
    }
    return count;
  }, [filters]);

  const handleCreateCustomReport = () => {
    setCustomReportOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by listing name or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters and Sorting */}
        <div className="flex gap-2 w-full sm:w-auto">
          <ReviewsReportFiltersSheet
            filters={filters}
            onFiltersChange={setFilters}
            activeFiltersCount={activeFiltersCount}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
          />
          
          <Select value={sortValue} onValueChange={setSortValue}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="listing_title-asc">Listing Name (A-Z)</SelectItem>
              <SelectItem value="listing_title-desc">Listing Name (Z-A)</SelectItem>
              <SelectItem value="total_reviews-desc">Most Reviews</SelectItem>
              <SelectItem value="average_rating-desc">Highest Rating</SelectItem>
              <SelectItem value="last_review_date-desc">Most Recent Review</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleCreateCustomReport}>
            <FileText className="mr-2 h-4 w-4" />
            Create Custom Report
          </Button>
        </div>
      </div>

      {/* Table */}
      <ReviewsReportTable data={filteredAndSortedData} loading={isLoading} />

      {/* Custom Report Dialog */}
      <CustomReviewsReportDialog open={customReportOpen} onOpenChange={setCustomReportOpen} />
    </div>
  );
}
