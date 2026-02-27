import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, SortAsc } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useDemoData } from "@/hooks/useDemoData";
import PayoutsFiltersSheet from "./PayoutsFiltersSheet";
import PayoutsTable from "./PayoutsTable";
import type { Payout } from "./types/financial";
import { toast } from "sonner";

const PayoutsManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minAmount, setMinAmount] = useState<number | undefined>();
  const [maxAmount, setMaxAmount] = useState<number | undefined>();
  const [sortValue, setSortValue] = useState("created_at-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const [sortBy, sortOrder] = sortValue.split("-");
  const { isDemoMode, getAdminPayouts, markPayoutAsPaid } = useDemoData();

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["admin-payouts", debouncedSearch, transactionTypeFilter, statusFilter, minAmount, maxAmount, sortBy, sortOrder, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return getAdminPayouts({
          searchQuery: debouncedSearch || null,
          transactionTypeFilter: transactionTypeFilter === "all" ? null : transactionTypeFilter,
          statusFilter: statusFilter === "all" ? null : statusFilter,
          minAmount: minAmount || null,
          maxAmount: maxAmount || null,
          sortBy,
          sortOrder,
        }) as Payout[];
      }

      const { data, error } = await supabase.rpc("admin_search_payouts", {
        search_query: debouncedSearch || null,
        transaction_type_filter: transactionTypeFilter === "all" ? null : transactionTypeFilter,
        status_filter: statusFilter === "all" ? null : statusFilter,
        min_amount: minAmount || null,
        max_amount: maxAmount || null,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (error) throw error;
      return (data || []) as Payout[];
    },
  });

  const handleMarkAsPaid = async (payoutId: string) => {
    const result = markPayoutAsPaid(payoutId);
    if (result.success) {
      toast.success("Payout marked as paid");
    } else {
      throw new Error(result.error || "Failed to mark payout as paid");
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (transactionTypeFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (minAmount !== undefined) count++;
    if (maxAmount !== undefined) count++;
    return count;
  }, [transactionTypeFilter, statusFilter, minAmount, maxAmount]);

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-sm">
          <Input
            placeholder="Search payouts, hosts, or listings..."
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
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payouts Table */}
      <PayoutsTable 
        payouts={payouts} 
        loading={isLoading} 
        isDemoMode={isDemoMode}
        onMarkAsPaid={handleMarkAsPaid}
      />

      {/* Filters Sheet */}
      <PayoutsFiltersSheet
        transactionTypeFilter={transactionTypeFilter}
        statusFilter={statusFilter}
        minAmount={minAmount}
        maxAmount={maxAmount}
        onTransactionTypeFilterChange={setTransactionTypeFilter}
        onStatusFilterChange={setStatusFilter}
        onMinAmountChange={setMinAmount}
        onMaxAmountChange={setMaxAmount}
        activeFiltersCount={activeFiltersCount}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      />
    </div>
  );
};

export default PayoutsManagement;
