import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, SortAsc } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import GuestDebtsFiltersSheet from "./GuestDebtsFiltersSheet";
import GuestDebtsTable from "./GuestDebtsTable";
import type { GuestDebt } from "./types/financial";

const GuestDebtsManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [minAmount, setMinAmount] = useState<number | undefined>();
  const [maxAmount, setMaxAmount] = useState<number | undefined>();
  const [sortValue, setSortValue] = useState("created_at-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const [sortBy, sortOrder] = sortValue.split("-");

  const { data: guestDebts = [], isLoading } = useQuery({
    queryKey: ["admin-guest-debts", debouncedSearch, statusFilter, reasonFilter, minAmount, maxAmount, sortBy, sortOrder],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_search_guest_debts", {
        search_query: debouncedSearch || null,
        status_filter: statusFilter === "all" ? null : statusFilter,
        reason_filter: reasonFilter === "all" ? null : reasonFilter,
        min_amount: minAmount || null,
        max_amount: maxAmount || null,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (error) throw error;
      return (data || []) as GuestDebt[];
    },
  });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (reasonFilter !== "all") count++;
    if (minAmount !== undefined) count++;
    if (maxAmount !== undefined) count++;
    return count;
  }, [statusFilter, reasonFilter, minAmount, maxAmount]);

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-sm">
          <Input
            placeholder="Search guests, disputes, or listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          <Select value={sortValue} onValueChange={setSortValue}>
            <SelectTrigger className="w-[180px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="amount-desc">Highest Amount</SelectItem>
              <SelectItem value="amount-asc">Lowest Amount</SelectItem>
              <SelectItem value="expires_at-desc">Expires Soon</SelectItem>
              <SelectItem value="expires_at-asc">Expires Later</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Guest Debts Table */}
      <GuestDebtsTable guestDebts={guestDebts} loading={isLoading} />

      {/* Filters Sheet */}
      <GuestDebtsFiltersSheet
        statusFilter={statusFilter}
        reasonFilter={reasonFilter}
        minAmount={minAmount}
        maxAmount={maxAmount}
        onStatusFilterChange={setStatusFilter}
        onReasonFilterChange={setReasonFilter}
        onMinAmountChange={setMinAmount}
        onMaxAmountChange={setMaxAmount}
        activeFiltersCount={activeFiltersCount}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      />
    </div>
  );
};

export default GuestDebtsManagement;
