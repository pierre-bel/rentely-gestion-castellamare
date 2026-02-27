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

interface BookingsFiltersSheetProps {
  statusFilter: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  checkinStart: Date | null;
  checkinEnd: Date | null;
  checkoutStart: Date | null;
  checkoutEnd: Date | null;
  onApplyFilters: (filters: {
    statusFilter: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    checkinStart: Date | null;
    checkinEnd: Date | null;
    checkoutStart: Date | null;
    checkoutEnd: Date | null;
  }) => void;
  onClearFilters: () => void;
}

export default function BookingsFiltersSheet({
  statusFilter,
  minPrice,
  maxPrice,
  checkinStart,
  checkinEnd,
  checkoutStart,
  checkoutEnd,
  onApplyFilters,
  onClearFilters,
}: BookingsFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string | null>(statusFilter);
  const [pendingMinPrice, setPendingMinPrice] = useState<number | null>(minPrice);
  const [pendingMaxPrice, setPendingMaxPrice] = useState<number | null>(maxPrice);
  const [pendingCheckinStart, setPendingCheckinStart] = useState<Date | null>(checkinStart);
  const [pendingCheckinEnd, setPendingCheckinEnd] = useState<Date | null>(checkinEnd);
  const [pendingCheckoutStart, setPendingCheckoutStart] = useState<Date | null>(checkoutStart);
  const [pendingCheckoutEnd, setPendingCheckoutEnd] = useState<Date | null>(checkoutEnd);

  useEffect(() => {
    setPendingStatusFilter(statusFilter);
    setPendingMinPrice(minPrice);
    setPendingMaxPrice(maxPrice);
    setPendingCheckinStart(checkinStart);
    setPendingCheckinEnd(checkinEnd);
    setPendingCheckoutStart(checkoutStart);
    setPendingCheckoutEnd(checkoutEnd);
  }, [statusFilter, minPrice, maxPrice, checkinStart, checkinEnd, checkoutStart, checkoutEnd]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
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
    setPendingStatusFilter(null);
    setPendingMinPrice(null);
    setPendingMaxPrice(null);
    setPendingCheckinStart(null);
    setPendingCheckinEnd(null);
    setPendingCheckoutStart(null);
    setPendingCheckoutEnd(null);
    onClearFilters();
    setOpen(false);
  };

  const activeFiltersCount = [
    statusFilter,
    minPrice,
    maxPrice,
    checkinStart,
    checkinEnd,
    checkoutStart,
    checkoutEnd,
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
          <SheetTitle>Filter Bookings</SheetTitle>
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
                <RadioGroupItem value="pending_payment" id="status-pending" />
                <Label htmlFor="status-pending" className="font-normal cursor-pointer">
                  Pending Payment
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="confirmed" id="status-confirmed" />
                <Label htmlFor="status-confirmed" className="font-normal cursor-pointer">
                  Confirmed
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completed" id="status-completed" />
                <Label htmlFor="status-completed" className="font-normal cursor-pointer">
                  Completed
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cancelled_guest" id="status-cancelled-guest" />
                <Label htmlFor="status-cancelled-guest" className="font-normal cursor-pointer">
                  Cancelled by Guest
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cancelled_host" id="status-cancelled-host" />
                <Label htmlFor="status-cancelled-host" className="font-normal cursor-pointer">
                  Cancelled by Host
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="expired" id="status-expired" />
                <Label htmlFor="status-expired" className="font-normal cursor-pointer">
                  Expired
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Price Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-price" className="text-xs text-muted-foreground">
                  Min Price
                </Label>
                <Input
                  id="min-price"
                  type="number"
                  placeholder="0"
                  value={pendingMinPrice || ""}
                  onChange={(e) => setPendingMinPrice(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="max-price" className="text-xs text-muted-foreground">
                  Max Price
                </Label>
                <Input
                  id="max-price"
                  type="number"
                  placeholder="10000"
                  value={pendingMaxPrice || ""}
                  onChange={(e) => setPendingMaxPrice(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Check-in Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Check-in Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkin-start" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !pendingCheckinStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCheckinStart ? format(pendingCheckinStart, "PP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={pendingCheckinStart || undefined}
                      onSelect={(date) => setPendingCheckinStart(date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="checkin-end" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !pendingCheckinEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCheckinEnd ? format(pendingCheckinEnd, "PP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={pendingCheckinEnd || undefined}
                      onSelect={(date) => setPendingCheckinEnd(date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Check-out Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Check-out Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkout-start" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !pendingCheckoutStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCheckoutStart ? format(pendingCheckoutStart, "PP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={pendingCheckoutStart || undefined}
                      onSelect={(date) => setPendingCheckoutStart(date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="checkout-end" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !pendingCheckoutEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingCheckoutEnd ? format(pendingCheckoutEnd, "PP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={pendingCheckoutEnd || undefined}
                      onSelect={(date) => setPendingCheckoutEnd(date || null)}
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
