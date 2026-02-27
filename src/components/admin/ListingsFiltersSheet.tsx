import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

interface ListingsFiltersSheetProps {
  statusFilter: string;
  minPrice: string;
  maxPrice: string;
  onApplyFilters: (filters: {
    statusFilter: string;
    minPrice: string;
    maxPrice: string;
  }) => void;
  onClearFilters: () => void;
}

export function ListingsFiltersSheet({
  statusFilter,
  minPrice,
  maxPrice,
  onApplyFilters,
  onClearFilters,
}: ListingsFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [pendingStatusFilter, setPendingStatusFilter] = useState(statusFilter);
  const [pendingMinPrice, setPendingMinPrice] = useState(minPrice);
  const [pendingMaxPrice, setPendingMaxPrice] = useState(maxPrice);

  // Sync pending filters with props when they change
  useEffect(() => {
    setPendingStatusFilter(statusFilter);
    setPendingMinPrice(minPrice);
    setPendingMaxPrice(maxPrice);
  }, [statusFilter, minPrice, maxPrice]);

  // Reset pending filters when sheet is closed
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset pending filters to applied filters
      setPendingStatusFilter(statusFilter);
      setPendingMinPrice(minPrice);
      setPendingMaxPrice(maxPrice);
    }
    setOpen(newOpen);
  };

  const handleApply = () => {
    onApplyFilters({
      statusFilter: pendingStatusFilter,
      minPrice: pendingMinPrice,
      maxPrice: pendingMaxPrice,
    });
    setOpen(false);
  };

  const handleClear = () => {
    setPendingStatusFilter("all");
    setPendingMinPrice("");
    setPendingMaxPrice("");
    onClearFilters();
    setOpen(false);
  };

  // Calculate active filter count
  const activeFilterCount = [
    statusFilter !== "all",
    minPrice !== "",
    maxPrice !== "",
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-5 w-5 flex items-center justify-center p-0 rounded-full"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Listings</SheetTitle>
          <SheetDescription>
            Apply filters to narrow down the listings
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            <RadioGroup
              value={pendingStatusFilter}
              onValueChange={setPendingStatusFilter}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="font-normal cursor-pointer">
                  All
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="draft" id="status-draft" />
                <Label htmlFor="status-draft" className="font-normal cursor-pointer">
                  Draft
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="status-pending" />
                <Label htmlFor="status-pending" className="font-normal cursor-pointer">
                  Pending
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="approved" id="status-approved" />
                <Label htmlFor="status-approved" className="font-normal cursor-pointer">
                  Approved
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rejected" id="status-rejected" />
                <Label htmlFor="status-rejected" className="font-normal cursor-pointer">
                  Rejected
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blocked" id="status-blocked" />
                <Label htmlFor="status-blocked" className="font-normal cursor-pointer">
                  Blocked
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Price Range</Label>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="min-price" className="text-sm">
                  Min Price
                </Label>
                <Input
                  id="min-price"
                  type="number"
                  placeholder="$0"
                  value={pendingMinPrice}
                  onChange={(e) => setPendingMinPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-price" className="text-sm">
                  Max Price
                </Label>
                <Input
                  id="max-price"
                  type="number"
                  placeholder="No limit"
                  value={pendingMaxPrice}
                  onChange={(e) => setPendingMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
