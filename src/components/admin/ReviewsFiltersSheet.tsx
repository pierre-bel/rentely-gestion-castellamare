import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ReviewsFiltersSheetProps {
  statusFilter: string;
  ratingFilter: string;
  onStatusFilterChange: (value: string) => void;
  onRatingFilterChange: (value: string) => void;
  activeFiltersCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReviewsFiltersSheet = ({
  statusFilter,
  ratingFilter,
  onStatusFilterChange,
  onRatingFilterChange,
  activeFiltersCount,
  open,
  onOpenChange,
}: ReviewsFiltersSheetProps) => {
  const [pendingStatusFilter, setPendingStatusFilter] = useState(statusFilter);
  const [pendingRatingFilter, setPendingRatingFilter] = useState(ratingFilter);

  // Sync local state when sheet opens or parent filter changes
  useEffect(() => {
    if (open) {
      setPendingStatusFilter(statusFilter);
      setPendingRatingFilter(ratingFilter);
    }
  }, [open, statusFilter, ratingFilter]);

  const handleClearFilters = () => {
    setPendingStatusFilter("all");
    setPendingRatingFilter("all");
    onStatusFilterChange("all");
    onRatingFilterChange("all");
  };

  const handleApply = () => {
    onStatusFilterChange(pendingStatusFilter);
    onRatingFilterChange(pendingRatingFilter);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Reviews</SheetTitle>
          <SheetDescription>Apply filters to narrow down the results</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            <RadioGroup value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="font-normal cursor-pointer">
                  All Statuses
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

          {/* Rating Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Rating</Label>
            <RadioGroup value={pendingRatingFilter} onValueChange={setPendingRatingFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="rating-all" />
                <Label htmlFor="rating-all" className="font-normal cursor-pointer">
                  All Ratings
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5" id="rating-5" />
                <Label htmlFor="rating-5" className="font-normal cursor-pointer">
                  5 Stars
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4" id="rating-4" />
                <Label htmlFor="rating-4" className="font-normal cursor-pointer">
                  4 Stars
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="rating-3" />
                <Label htmlFor="rating-3" className="font-normal cursor-pointer">
                  3 Stars
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="rating-2" />
                <Label htmlFor="rating-2" className="font-normal cursor-pointer">
                  2 Stars
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="rating-1" />
                <Label htmlFor="rating-1" className="font-normal cursor-pointer">
                  1 Star
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
          <SheetClose asChild>
            <Button onClick={handleApply}>Apply Filters</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
