import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { ReviewsTable } from "./ReviewsTable";
import { ReviewsFiltersSheet } from "./ReviewsFiltersSheet";
import { ReviewDetailDialog } from "./ReviewDetailDialog";
import { toast } from "sonner";
import { useDemoData } from "@/hooks/useDemoData";

type ReviewStatus = "all" | "pending" | "approved" | "rejected" | "blocked";

interface Review {
  id: string;
  booking_id: string;
  author_user_id: string;
  rating: number;
  text: string;
  status: string;
  created_at: string;
  updated_at: string;
  guest_name: string;
  guest_email: string;
  guest_avatar: string;
  host_name: string;
  host_email: string;
  listing_id: string;
  listing_title: string;
  listing_city: string;
  listing_country: string;
  booking_checkin: string;
  booking_checkout: string;
  booking_status: string;
}

const ReviewsManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortValue, setSortValue] = useState("created_at-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { isDemoMode, getAdminReviews, updateAdminReviewStatus } = useDemoData();

  const debouncedSearch = useDebounce(searchQuery, 500);

  const [sortBy, sortOrder] = sortValue.split("-");

  const { data: reviews = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-reviews", debouncedSearch, statusFilter, ratingFilter, sortBy, sortOrder, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        const filters = {
          searchQuery: debouncedSearch || null,
          statusFilter: statusFilter === "all" ? null : statusFilter,
          ratingFilter: ratingFilter === "all" ? null : parseInt(ratingFilter),
          sortBy,
          sortOrder,
        };
        return getAdminReviews(filters);
      }
      
      const { data, error } = await supabase.rpc("admin_search_reviews", {
        search_query: debouncedSearch || null,
        status_filter: statusFilter === "all" ? null : statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (error) throw error;
      
      // Filter by rating on client side
      let filteredData = data as Review[];
      if (ratingFilter !== "all") {
        filteredData = filteredData.filter(review => review.rating === parseInt(ratingFilter));
      }
      
      return filteredData;
    },
  });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (ratingFilter !== "all") count++;
    return count;
  }, [statusFilter, ratingFilter]);

  const handleRowClick = (review: Review) => {
    setSelectedReview(review);
    setDetailDialogOpen(true);
  };

  const handleStatusUpdated = () => {
    refetch();
  };

  const handleStatusChange = async (reviewId: string, newStatus: "approved" | "rejected" | "blocked") => {
    try {
      if (isDemoMode) {
        const success = updateAdminReviewStatus(reviewId, newStatus);
        if (success) {
          toast.success(`Review ${newStatus} successfully`);
          refetch();
        } else {
          toast.error("Failed to update review status");
        }
        return;
      }
      
      const { error } = await supabase
        .from("reviews")
        .update({ status: newStatus })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success(`Review ${newStatus} successfully`);
      refetch();
    } catch (error) {
      console.error("Error updating review status:", error);
      toast.error("Failed to update review status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reviews by guest, host, listing, or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <ReviewsFiltersSheet
            statusFilter={statusFilter}
            ratingFilter={ratingFilter}
            onStatusFilterChange={(value) => setStatusFilter(value as ReviewStatus)}
            onRatingFilterChange={setRatingFilter}
            activeFiltersCount={activeFiltersCount}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
          />

          <Select value={sortValue} onValueChange={setSortValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="rating-desc">Highest Rating</SelectItem>
              <SelectItem value="rating-asc">Lowest Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reviews Table */}
      <ReviewsTable 
        reviews={reviews} 
        loading={isLoading} 
        onRowClick={handleRowClick}
        onStatusChange={handleStatusChange}
      />

      {/* Detail Dialog */}
      <ReviewDetailDialog
        review={selectedReview}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
};

export default ReviewsManagement;
