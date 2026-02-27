import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DisputesFiltersSheet from "./DisputesFiltersSheet";
import DisputesTable from "./DisputesTable";
import DisputesKanban from "./DisputesKanban";
import { AdminDispute } from "./types/disputes";
import { useDebounce } from "@/hooks/useDebounce";
import { useDemoData } from "@/hooks/useDemoData";

export default function DisputesManagement() {
  const { isDemoMode, getAdminDisputes } = useDemoData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [minAmount, setMinAmount] = useState<number | null>(null);
  const [maxAmount, setMaxAmount] = useState<number | null>(null);
  const [createdStart, setCreatedStart] = useState<Date | null>(null);
  const [createdEnd, setCreatedEnd] = useState<Date | null>(null);
  const [sortValue, setSortValue] = useState("created_at-desc");

  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: [
      "admin-disputes",
      debouncedSearch,
      statusFilter,
      categoryFilter,
      minAmount,
      maxAmount,
      createdStart,
      createdEnd,
      sortValue,
      isDemoMode,
    ],
    queryFn: async () => {
      if (isDemoMode) {
        // DEMO MODE: Get from localStorage
        const [sortBy, sortOrder] = sortValue.split("-");
        return getAdminDisputes({
          searchQuery: debouncedSearch || null,
          statusFilter,
          categoryFilter,
          minAmount,
          maxAmount,
          createdStart: createdStart ? createdStart.toISOString().split("T")[0] : null,
          createdEnd: createdEnd ? createdEnd.toISOString().split("T")[0] : null,
          sortBy,
          sortOrder,
        });
      } else {
        // REAL MODE: Query Supabase
        const [sortBy, sortOrder] = sortValue.split("-");

        const { data, error } = await supabase.rpc("admin_search_disputes", {
          search_query: debouncedSearch || null,
          status_filter: statusFilter,
          category_filter: categoryFilter,
          min_amount: minAmount,
          max_amount: maxAmount,
          created_start: createdStart ? createdStart.toISOString().split("T")[0] : null,
          created_end: createdEnd ? createdEnd.toISOString().split("T")[0] : null,
          sort_by: sortBy,
          sort_order: sortOrder,
        });

        if (error) throw error;
        return data as AdminDispute[];
      }
    },
  });

  const handleApplyFilters = (filters: {
    statusFilter: string | null;
    categoryFilter: string | null;
    minAmount: number | null;
    maxAmount: number | null;
    createdStart: Date | null;
    createdEnd: Date | null;
  }) => {
    setStatusFilter(filters.statusFilter);
    setCategoryFilter(filters.categoryFilter);
    setMinAmount(filters.minAmount);
    setMaxAmount(filters.maxAmount);
    setCreatedStart(filters.createdStart);
    setCreatedEnd(filters.createdEnd);
  };

  const handleClearFilters = () => {
    setStatusFilter(null);
    setCategoryFilter(null);
    setMinAmount(null);
    setMaxAmount(null);
    setCreatedStart(null);
    setCreatedEnd(null);
  };

  const activeFiltersCount = useMemo(() => {
    return [
      statusFilter,
      categoryFilter,
      minAmount,
      maxAmount,
      createdStart,
      createdEnd,
    ].filter(Boolean).length;
  }, [statusFilter, categoryFilter, minAmount, maxAmount, createdStart, createdEnd]);

  return (
    <Card className="bg-card">
      <CardContent className="py-6">
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>

          {/* Control Bar */}
          <div className="flex items-center justify-between gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by guest, host, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Filters and Sort */}
            <div className="flex items-center gap-2">
              <DisputesFiltersSheet
                statusFilter={statusFilter}
                categoryFilter={categoryFilter}
                minAmount={minAmount}
                maxAmount={maxAmount}
                createdStart={createdStart}
                createdEnd={createdEnd}
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
                  <SelectItem value="updated_at-desc">Last Updated (Newest)</SelectItem>
                  <SelectItem value="updated_at-asc">Last Updated (Oldest)</SelectItem>
                  <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                  <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="table">
            <DisputesTable disputes={disputes} loading={isLoading} />
          </TabsContent>

          <TabsContent value="kanban" className="-mx-6">
            <div className="px-6">
              <DisputesKanban disputes={disputes} loading={isLoading} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
