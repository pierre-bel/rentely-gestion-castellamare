import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { HostPayoutsTable } from "./HostPayoutsTable";
import { HostPayoutsFiltersSheet } from "./HostPayoutsFiltersSheet";
import { HostPayoutsSummary } from "./HostPayoutsSummary";
import { HostPayout } from "./types/financial";
import { useAuth } from "@/hooks/useAuth";

export default function HostPayouts() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortValue, setSortValue] = useState("created_at-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const [sortBy, sortOrder] = sortValue.split("-");

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["host-payouts", user?.id, debouncedSearch, statusFilter, transactionTypeFilter, minAmount, maxAmount, sortBy, sortOrder],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase.rpc("host_search_payouts", {
        p_host_user_id: user.id,
        p_search_query: debouncedSearch || null,
        p_status_filter: statusFilter === "all" ? null : statusFilter,
        p_transaction_type_filter: transactionTypeFilter === "all" ? null : transactionTypeFilter,
        p_min_amount: minAmount ? parseFloat(minAmount) : null,
        p_max_amount: maxAmount ? parseFloat(maxAmount) : null,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
      });

      if (error) throw error;
      return (data || []) as unknown as HostPayout[];
    },
    enabled: !!user?.id,
  });

  const activeFilterCount = [
    statusFilter !== "all",
    transactionTypeFilter !== "all",
    minAmount !== "",
    maxAmount !== "",
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setStatusFilter("all");
    setTransactionTypeFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setFiltersOpen(false);
  };

  const handleApplyFilters = () => {
    setFiltersOpen(false);
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        {/* Financial Summary Cards */}
        <HostPayoutsSummary payouts={payouts} />

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="w-full sm:w-auto sm:flex-1 max-w-sm">
            <Input
              placeholder="Search by listing or guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen(true)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 min-w-5 h-5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            <Select value={sortValue} onValueChange={setSortValue}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                <SelectItem value="payout_date-desc">Pay Date Latest</SelectItem>
                <SelectItem value="payout_date-asc">Pay Date Earliest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <HostPayoutsTable payouts={payouts} isLoading={isLoading} />
      </CardContent>

      <HostPayoutsFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        transactionTypeFilter={transactionTypeFilter}
        onTransactionTypeFilterChange={setTransactionTypeFilter}
        minAmount={minAmount}
        onMinAmountChange={setMinAmount}
        maxAmount={maxAmount}
        onMaxAmountChange={setMaxAmount}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />
    </Card>
  );
}
