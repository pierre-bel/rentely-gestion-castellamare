import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DisputesFiltersSheetProps {
  statusFilter: string | null;
  categoryFilter: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  createdStart: Date | null;
  createdEnd: Date | null;
  onApplyFilters: (filters: {
    statusFilter: string | null;
    categoryFilter: string | null;
    minAmount: number | null;
    maxAmount: number | null;
    createdStart: Date | null;
    createdEnd: Date | null;
  }) => void;
  onClearFilters: () => void;
}

export default function DisputesFiltersSheet({
  statusFilter,
  categoryFilter,
  minAmount,
  maxAmount,
  createdStart,
  createdEnd,
  onApplyFilters,
  onClearFilters,
}: DisputesFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string | null>(statusFilter);
  const [pendingCategoryFilter, setPendingCategoryFilter] = useState<string | null>(categoryFilter);
  const [pendingMinAmount, setPendingMinAmount] = useState<number | null>(minAmount);
  const [pendingMaxAmount, setPendingMaxAmount] = useState<number | null>(maxAmount);
  const [pendingCreatedStart, setPendingCreatedStart] = useState<Date | null>(createdStart);
  const [pendingCreatedEnd, setPendingCreatedEnd] = useState<Date | null>(createdEnd);

  useEffect(() => {
    setPendingStatusFilter(statusFilter);
    setPendingCategoryFilter(categoryFilter);
    setPendingMinAmount(minAmount);
    setPendingMaxAmount(maxAmount);
    setPendingCreatedStart(createdStart);
    setPendingCreatedEnd(createdEnd);
  }, [statusFilter, categoryFilter, minAmount, maxAmount, createdStart, createdEnd]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPendingStatusFilter(statusFilter);
      setPendingCategoryFilter(categoryFilter);
      setPendingMinAmount(minAmount);
      setPendingMaxAmount(maxAmount);
      setPendingCreatedStart(createdStart);
      setPendingCreatedEnd(createdEnd);
    }
    setOpen(newOpen);
  };

  const handleApply = () => {
    onApplyFilters({
      statusFilter: pendingStatusFilter,
      categoryFilter: pendingCategoryFilter,
      minAmount: pendingMinAmount,
      maxAmount: pendingMaxAmount,
      createdStart: pendingCreatedStart,
      createdEnd: pendingCreatedEnd,
    });
    setOpen(false);
  };

  const handleClear = () => {
    setPendingStatusFilter(null);
    setPendingCategoryFilter(null);
    setPendingMinAmount(null);
    setPendingMaxAmount(null);
    setPendingCreatedStart(null);
    setPendingCreatedEnd(null);
    onClearFilters();
    setOpen(false);
  };

  const activeFiltersCount = [
    statusFilter,
    categoryFilter,
    minAmount,
    maxAmount,
    createdStart,
    createdEnd,
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 rounded-full h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Disputes</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Status</Label>
            <RadioGroup
              value={pendingStatusFilter || "all"}
              onValueChange={(value) => setPendingStatusFilter(value === "all" ? null : value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="font-normal cursor-pointer">
                  All Statuses
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open" id="status-open" />
                <Label htmlFor="status-open" className="font-normal cursor-pointer">
                  Open
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="in_progress" id="status-in-progress" />
                <Label htmlFor="status-in-progress" className="font-normal cursor-pointer">
                  In Progress
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="on_hold" id="status-on-hold" />
                <Label htmlFor="status-on-hold" className="font-normal cursor-pointer">
                  On Hold
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="resolved_approved" id="status-resolved-approved" />
                <Label htmlFor="status-resolved-approved" className="font-normal cursor-pointer">
                  Resolved (Approved)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="resolved_declined" id="status-resolved-declined" />
                <Label htmlFor="status-resolved-declined" className="font-normal cursor-pointer">
                  Resolved (Declined)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Category</Label>
            <RadioGroup
              value={pendingCategoryFilter || "all"}
              onValueChange={(value) => setPendingCategoryFilter(value === "all" ? null : value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="category-all" />
                <Label htmlFor="category-all" className="font-normal cursor-pointer">
                  All Categories
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="refund_request" id="category-refund" />
                <Label htmlFor="category-refund" className="font-normal cursor-pointer">
                  Refund Request
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="policy_violation" id="category-policy" />
                <Label htmlFor="category-policy" className="font-normal cursor-pointer">
                  Policy Violation
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="property_damage" id="category-damage" />
                <Label htmlFor="category-damage" className="font-normal cursor-pointer">
                  Property Damage
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cleanliness_issue" id="category-cleanliness" />
                <Label htmlFor="category-cleanliness" className="font-normal cursor-pointer">
                  Cleanliness Issue
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="amenity_issue" id="category-amenity" />
                <Label htmlFor="category-amenity" className="font-normal cursor-pointer">
                  Amenity Issue
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="safety_concern" id="category-safety" />
                <Label htmlFor="category-safety" className="font-normal cursor-pointer">
                  Safety Concern
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="billing_dispute" id="category-billing" />
                <Label htmlFor="category-billing" className="font-normal cursor-pointer">
                  Billing Dispute
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="category-other" />
                <Label htmlFor="category-other" className="font-normal cursor-pointer">
                  Other
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount Range */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Refund Amount Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-amount" className="text-xs text-muted-foreground">
                  Min Amount
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  placeholder="0"
                  value={pendingMinAmount || ""}
                  onChange={(e) => setPendingMinAmount(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="max-amount" className="text-xs text-muted-foreground">
                  Max Amount
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  placeholder="10000"
                  value={pendingMaxAmount || ""}
                  onChange={(e) => setPendingMaxAmount(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Created Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Created Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="created-start" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !pendingCreatedStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCreatedStart ? format(pendingCreatedStart, "PP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={pendingCreatedStart || undefined}
                      onSelect={(date) => setPendingCreatedStart(date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="created-end" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !pendingCreatedEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCreatedEnd ? format(pendingCreatedEnd, "PP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={pendingCreatedEnd || undefined}
                      onSelect={(date) => setPendingCreatedEnd(date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear Filters
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
