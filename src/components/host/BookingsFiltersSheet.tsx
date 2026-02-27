import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Filter, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BookingsFiltersSheetProps {
  statusFilter: string;
  minPrice: string;
  maxPrice: string;
  checkinStart: Date | undefined;
  checkinEnd: Date | undefined;
  checkoutStart: Date | undefined;
  checkoutEnd: Date | undefined;
  onApplyFilters: (filters: {
    statusFilter: string;
    minPrice: string;
    maxPrice: string;
    checkinStart: Date | undefined;
    checkinEnd: Date | undefined;
    checkoutStart: Date | undefined;
    checkoutEnd: Date | undefined;
  }) => void;
  onClearFilters: () => void;
}

export const BookingsFiltersSheet = ({
  statusFilter,
  minPrice,
  maxPrice,
  checkinStart,
  checkinEnd,
  checkoutStart,
  checkoutEnd,
  onApplyFilters,
  onClearFilters,
}: BookingsFiltersSheetProps) => {
  const [open, setOpen] = useState(false);
  
  // Internal state for pending filter changes
  const [pendingStatusFilter, setPendingStatusFilter] = useState(statusFilter);
  const [pendingMinPrice, setPendingMinPrice] = useState(minPrice);
  const [pendingMaxPrice, setPendingMaxPrice] = useState(maxPrice);
  const [pendingCheckinStart, setPendingCheckinStart] = useState(checkinStart);
  const [pendingCheckinEnd, setPendingCheckinEnd] = useState(checkinEnd);
  const [pendingCheckoutStart, setPendingCheckoutStart] = useState(checkoutStart);
  const [pendingCheckoutEnd, setPendingCheckoutEnd] = useState(checkoutEnd);

  // Update internal state when props change (after applying filters)
  useEffect(() => {
    setPendingStatusFilter(statusFilter);
    setPendingMinPrice(minPrice);
    setPendingMaxPrice(maxPrice);
    setPendingCheckinStart(checkinStart);
    setPendingCheckinEnd(checkinEnd);
    setPendingCheckoutStart(checkoutStart);
    setPendingCheckoutEnd(checkoutEnd);
  }, [statusFilter, minPrice, maxPrice, checkinStart, checkinEnd, checkoutStart, checkoutEnd]);

  // Reset pending filters to current applied filters when sheet closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset to applied filters
      setPendingStatusFilter(statusFilter);
      setPendingMinPrice(minPrice);
      setPendingMaxPrice(maxPrice);
      setPendingCheckinStart(checkinStart);
      setPendingCheckinEnd(checkinEnd);
      setPendingCheckoutStart(checkoutStart);
      setPendingCheckoutEnd(checkoutEnd);
    }
    setOpen(newOpen);
  };

  const handleApply = () => {
    onApplyFilters({
      statusFilter: pendingStatusFilter,
      minPrice: pendingMinPrice,
      maxPrice: pendingMaxPrice,
      checkinStart: pendingCheckinStart,
      checkinEnd: pendingCheckinEnd,
      checkoutStart: pendingCheckoutStart,
      checkoutEnd: pendingCheckoutEnd,
    });
    setOpen(false);
  };

  const handleClear = () => {
    setPendingStatusFilter("all");
    setPendingMinPrice("");
    setPendingMaxPrice("");
    setPendingCheckinStart(undefined);
    setPendingCheckinEnd(undefined);
    setPendingCheckoutStart(undefined);
    setPendingCheckoutEnd(undefined);
    onClearFilters();
    setOpen(false);
  };

  const activeFiltersCount = [
    statusFilter !== "all",
    minPrice !== "",
    maxPrice !== "",
    checkinStart !== undefined,
    checkinEnd !== undefined,
    checkoutStart !== undefined,
    checkoutEnd !== undefined,
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center" variant="default">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Bookings</SheetTitle>
          <SheetDescription>
            Apply filters to find specific bookings
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            <RadioGroup value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">All Statuses</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="confirmed" id="confirmed" />
                <Label htmlFor="confirmed" className="font-normal cursor-pointer">Confirmed</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending_payment" id="pending_payment" />
                <Label htmlFor="pending_payment" className="font-normal cursor-pointer">Pending Payment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cancelled" id="cancelled" />
                <Label htmlFor="cancelled" className="font-normal cursor-pointer">Cancelled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completed" id="completed" />
                <Label htmlFor="completed" className="font-normal cursor-pointer">Completed</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Amount Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minPrice" className="text-sm font-normal mb-2 block">Min Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="minPrice"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={pendingMinPrice}
                    onChange={(e) => setPendingMinPrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="maxPrice" className="text-sm font-normal mb-2 block">Max Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="maxPrice"
                    type="number"
                    min="0"
                    placeholder="Any"
                    value={pendingMaxPrice}
                    onChange={(e) => setPendingMaxPrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Check-in Date Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Check-in Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-2 block">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pendingCheckinStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCheckinStart ? format(pendingCheckinStart, "MMM dd, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pendingCheckinStart}
                      onSelect={setPendingCheckinStart}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm font-normal mb-2 block">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pendingCheckinEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCheckinEnd ? format(pendingCheckinEnd, "MMM dd, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pendingCheckinEnd}
                      onSelect={setPendingCheckinEnd}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Check-out Date Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Check-out Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-2 block">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pendingCheckoutStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCheckoutStart ? format(pendingCheckoutStart, "MMM dd, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pendingCheckoutStart}
                      onSelect={setPendingCheckoutStart}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm font-normal mb-2 block">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !pendingCheckoutEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCheckoutEnd ? format(pendingCheckoutEnd, "MMM dd, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pendingCheckoutEnd}
                      onSelect={setPendingCheckoutEnd}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex gap-2">
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
};
