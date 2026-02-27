import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookingsFiltersSheet from "./BookingsFiltersSheet";
import BookingsTable from "./BookingsTable";
import { AdminBooking } from "./types/bookings";
import { useDebounce } from "@/hooks/useDebounce";

export default function BookingsManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [checkinStart, setCheckinStart] = useState<Date | null>(null);
  const [checkinEnd, setCheckinEnd] = useState<Date | null>(null);
  const [checkoutStart, setCheckoutStart] = useState<Date | null>(null);
  const [checkoutEnd, setCheckoutEnd] = useState<Date | null>(null);
  const [sortValue, setSortValue] = useState("created_at-desc");

  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: [
      "admin-bookings",
      debouncedSearch,
      statusFilter,
      minPrice,
      maxPrice,
      checkinStart,
      checkinEnd,
      checkoutStart,
      checkoutEnd,
      sortValue,
    ],
    queryFn: async () => {
      const [sortBy, sortOrder] = sortValue.split("-");

      const { data, error } = await supabase.rpc("admin_search_bookings", {
        search_query: debouncedSearch || null,
        status_filter: statusFilter as any,
        min_price: minPrice,
        max_price: maxPrice,
        checkin_start: checkinStart ? checkinStart.toISOString().split("T")[0] : null,
        checkin_end: checkinEnd ? checkinEnd.toISOString().split("T")[0] : null,
        checkout_start: checkoutStart ? checkoutStart.toISOString().split("T")[0] : null,
        checkout_end: checkoutEnd ? checkoutEnd.toISOString().split("T")[0] : null,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (error) throw error;
      return data as AdminBooking[];
    },
  });

  const handleApplyFilters = (filters: {
    statusFilter: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    checkinStart: Date | null;
    checkinEnd: Date | null;
    checkoutStart: Date | null;
    checkoutEnd: Date | null;
  }) => {
    setStatusFilter(filters.statusFilter);
    setMinPrice(filters.minPrice);
    setMaxPrice(filters.maxPrice);
    setCheckinStart(filters.checkinStart);
    setCheckinEnd(filters.checkinEnd);
    setCheckoutStart(filters.checkoutStart);
    setCheckoutEnd(filters.checkoutEnd);
  };

  const handleClearFilters = () => {
    setStatusFilter(null);
    setMinPrice(null);
    setMaxPrice(null);
    setCheckinStart(null);
    setCheckinEnd(null);
    setCheckoutStart(null);
    setCheckoutEnd(null);
  };

  const activeFiltersCount = useMemo(() => {
    return [
      statusFilter,
      minPrice,
      maxPrice,
      checkinStart,
      checkinEnd,
      checkoutStart,
      checkoutEnd,
    ].filter(Boolean).length;
  }, [statusFilter, minPrice, maxPrice, checkinStart, checkinEnd, checkoutStart, checkoutEnd]);

  return (
    <Card className="bg-card">
      <CardContent className="py-6">
        {/* Control Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by listing, host, or guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex items-center gap-2">
          <BookingsFiltersSheet
            statusFilter={statusFilter}
            minPrice={minPrice}
            maxPrice={maxPrice}
            checkinStart={checkinStart}
            checkinEnd={checkinEnd}
            checkoutStart={checkoutStart}
            checkoutEnd={checkoutEnd}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
          <Select value={sortValue} onValueChange={setSortValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Date Created (Newest)</SelectItem>
              <SelectItem value="created_at-asc">Date Created (Oldest)</SelectItem>
              <SelectItem value="checkin_date-desc">Check-in (Latest)</SelectItem>
              <SelectItem value="checkin_date-asc">Check-in (Earliest)</SelectItem>
              <SelectItem value="total_price-desc">Price (High to Low)</SelectItem>
              <SelectItem value="total_price-asc">Price (Low to High)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

        {/* Table */}
        <BookingsTable bookings={bookings} loading={isLoading} />
      </CardContent>
    </Card>
  );
}
