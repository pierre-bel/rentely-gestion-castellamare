import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

interface HostPayoutsFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  minAmount: string;
  onMinAmountChange: (value: string) => void;
  maxAmount: string;
  onMaxAmountChange: (value: string) => void;
  transactionTypeFilter: string;
  onTransactionTypeFilterChange: (value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

const getActiveFilterCount = (statusFilter: string, transactionTypeFilter: string, minAmount: string, maxAmount: string): number => {
  return [
    statusFilter !== "all",
    transactionTypeFilter !== "all",
    minAmount !== "",
    maxAmount !== "",
  ].filter(Boolean).length;
};

export function HostPayoutsFiltersSheet({
  open,
  onOpenChange,
  statusFilter,
  onStatusFilterChange,
  transactionTypeFilter,
  onTransactionTypeFilterChange,
  minAmount,
  onMinAmountChange,
  maxAmount,
  onMaxAmountChange,
  onApplyFilters,
  onClearFilters,
}: HostPayoutsFiltersSheetProps) {
  const [pendingStatusFilter, setPendingStatusFilter] = useState(statusFilter);
  const [pendingMinAmount, setPendingMinAmount] = useState(minAmount);
  const [pendingMaxAmount, setPendingMaxAmount] = useState(maxAmount);
  const [pendingTransactionTypeFilter, setPendingTransactionTypeFilter] = useState(transactionTypeFilter);

  useEffect(() => {
    if (open) {
      setPendingStatusFilter(statusFilter);
      setPendingMinAmount(minAmount);
      setPendingMaxAmount(maxAmount);
      setPendingTransactionTypeFilter(transactionTypeFilter);
    }
  }, [open, statusFilter, minAmount, maxAmount, transactionTypeFilter]);

  const handleApply = () => {
    onStatusFilterChange(pendingStatusFilter);
    onMinAmountChange(pendingMinAmount);
    onMaxAmountChange(pendingMaxAmount);
    onTransactionTypeFilterChange(pendingTransactionTypeFilter);
    onApplyFilters();
  };

  const handleClear = () => {
    setPendingStatusFilter("all");
    setPendingMinAmount("");
    setPendingMaxAmount("");
    setPendingTransactionTypeFilter("all");
    onClearFilters();
  };

  const activeFiltersCount = getActiveFilterCount(pendingStatusFilter, pendingTransactionTypeFilter, pendingMinAmount, pendingMaxAmount);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Payouts</SheetTitle>
          <SheetDescription>
            Apply filters to refine your payout search
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          {/* Transaction Type Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Transaction Type</Label>
            <RadioGroup value={pendingTransactionTypeFilter} onValueChange={setPendingTransactionTypeFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="type-all" />
                <Label htmlFor="type-all" className="font-normal cursor-pointer">All Transactions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="booking_payout" id="type-earning" />
                <Label htmlFor="type-earning" className="font-normal cursor-pointer">Regular Earnings</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debt_collection" id="type-debt" />
                <Label htmlFor="type-debt" className="font-normal cursor-pointer">Debt Collections</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="refund_debt" id="type-refund" />
                <Label htmlFor="type-refund" className="font-normal cursor-pointer">Refund Debts</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cancelled" id="type-cancelled" />
                <Label htmlFor="type-cancelled" className="font-normal cursor-pointer">Cancelled Bookings</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            <RadioGroup value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="font-normal cursor-pointer">All Statuses</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="status-pending" />
                <Label htmlFor="status-pending" className="font-normal cursor-pointer">Pending</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="processing" id="status-processing" />
                <Label htmlFor="status-processing" className="font-normal cursor-pointer">Processing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completed" id="status-completed" />
                <Label htmlFor="status-completed" className="font-normal cursor-pointer">Completed</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="settled" id="status-settled" />
                <Label htmlFor="status-settled" className="font-normal cursor-pointer">Settled</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Amount Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Amount Range</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="min-amount" className="text-sm text-muted-foreground">Minimum</Label>
                <Input
                  id="min-amount"
                  type="number"
                  placeholder="0.00"
                  value={pendingMinAmount}
                  onChange={(e) => setPendingMinAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="max-amount" className="text-sm text-muted-foreground">Maximum</Label>
                <Input
                  id="max-amount"
                  type="number"
                  placeholder="0.00"
                  value={pendingMaxAmount}
                  onChange={(e) => setPendingMaxAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
            {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
