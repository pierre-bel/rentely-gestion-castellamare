import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface TransactionsFiltersSheetProps {
  typeFilter: string;
  statusFilter: string;
  minAmount: number | undefined;
  maxAmount: number | undefined;
  onTypeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onMinAmountChange: (value: number | undefined) => void;
  onMaxAmountChange: (value: number | undefined) => void;
  activeFiltersCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TransactionsFiltersSheet = ({
  typeFilter,
  statusFilter,
  minAmount,
  maxAmount,
  onTypeFilterChange,
  onStatusFilterChange,
  onMinAmountChange,
  onMaxAmountChange,
  activeFiltersCount,
  open,
  onOpenChange,
}: TransactionsFiltersSheetProps) => {
  const [pendingTypeFilter, setPendingTypeFilter] = useState(typeFilter);
  const [pendingStatusFilter, setPendingStatusFilter] = useState(statusFilter);
  const [pendingMinAmount, setPendingMinAmount] = useState<string>(minAmount?.toString() || "");
  const [pendingMaxAmount, setPendingMaxAmount] = useState<string>(maxAmount?.toString() || "");

  useEffect(() => {
    if (open) {
      setPendingTypeFilter(typeFilter);
      setPendingStatusFilter(statusFilter);
      setPendingMinAmount(minAmount?.toString() || "");
      setPendingMaxAmount(maxAmount?.toString() || "");
    }
  }, [open, typeFilter, statusFilter, minAmount, maxAmount]);

  const handleApply = () => {
    onTypeFilterChange(pendingTypeFilter);
    onStatusFilterChange(pendingStatusFilter);
    onMinAmountChange(pendingMinAmount ? parseFloat(pendingMinAmount) : undefined);
    onMaxAmountChange(pendingMaxAmount ? parseFloat(pendingMaxAmount) : undefined);
    onOpenChange(false);
  };

  const handleClear = () => {
    setPendingTypeFilter("all");
    setPendingStatusFilter("all");
    setPendingMinAmount("");
    setPendingMaxAmount("");
    onTypeFilterChange("all");
    onStatusFilterChange("all");
    onMinAmountChange(undefined);
    onMaxAmountChange(undefined);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Transactions</SheetTitle>
          <SheetDescription>
            Apply filters to refine your transaction search
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Type Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Transaction Type</Label>
            <RadioGroup value={pendingTypeFilter} onValueChange={setPendingTypeFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="type-all" />
                <Label htmlFor="type-all" className="font-normal cursor-pointer">All Types</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="capture" id="type-capture" />
                <Label htmlFor="type-capture" className="font-normal cursor-pointer">Capture</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="refund" id="type-refund" />
                <Label htmlFor="type-refund" className="font-normal cursor-pointer">Refund</Label>
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
                <RadioGroupItem value="succeeded" id="status-succeeded" />
                <Label htmlFor="status-succeeded" className="font-normal cursor-pointer">Succeeded</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="status-pending" />
                <Label htmlFor="status-pending" className="font-normal cursor-pointer">Pending</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="failed" id="status-failed" />
                <Label htmlFor="status-failed" className="font-normal cursor-pointer">Failed</Label>
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
};

export default TransactionsFiltersSheet;
