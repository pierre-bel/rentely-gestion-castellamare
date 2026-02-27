import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Filter, Star } from "lucide-react";
import { format, subDays, subMonths, subYears, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import type { ReviewsReportFilters } from "./types/reviews-report";

interface ReviewsReportFiltersSheetProps {
  filters: ReviewsReportFilters;
  onFiltersChange: (filters: ReviewsReportFilters) => void;
  activeFiltersCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReviewsReportFiltersSheet({
  filters,
  onFiltersChange,
  activeFiltersCount,
  open,
  onOpenChange,
}: ReviewsReportFiltersSheetProps) {
  const [pendingFilters, setPendingFilters] = useState<ReviewsReportFilters>(filters);

  useEffect(() => {
    if (open) {
      setPendingFilters(filters);
    }
  }, [open, filters]);

  const handleClearFilters = () => {
    const defaultFilters: ReviewsReportFilters = {
      startDate: subYears(new Date(), 1),
      endDate: new Date(),
      minRating: null,
    };
    setPendingFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onOpenChange(false);
  };

  const handleApply = () => {
    onFiltersChange(pendingFilters);
    onOpenChange(false);
  };

  const handleQuickRange = (range: string) => {
    const today = new Date();
    let startDate: Date;
    
    switch (range) {
      case "week":
        startDate = subDays(today, 7);
        break;
      case "month":
        startDate = subMonths(today, 1);
        break;
      case "quarter":
        startDate = subMonths(today, 3);
        break;
      case "year":
        startDate = subYears(today, 1);
        break;
      case "all":
        startDate = new Date("2020-01-01");
        break;
      default:
        startDate = subYears(today, 1);
    }
    
    setPendingFilters({ ...pendingFilters, startDate, endDate: today });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="default">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Reviews Report</SheetTitle>
          <SheetDescription>
            Customize the date range and rating filters for the reviews report
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 py-6">
          {/* Date Range Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Date Range</Label>
            
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Quick Ranges</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRange("week")}
                >
                  Last Week
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRange("month")}
                >
                  Last Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRange("quarter")}
                >
                  Last Quarter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRange("year")}
                >
                  Last Year
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="col-span-2"
                  onClick={() => handleQuickRange("all")}
                >
                  All Time
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white",
                        !pendingFilters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingFilters.startDate ? format(pendingFilters.startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar
                      mode="single"
                      selected={pendingFilters.startDate}
                      onSelect={(date) => date && setPendingFilters({ ...pendingFilters, startDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white",
                        !pendingFilters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pendingFilters.endDate ? format(pendingFilters.endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar
                      mode="single"
                      selected={pendingFilters.endDate}
                      onSelect={(date) => date && setPendingFilters({ ...pendingFilters, endDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Minimum Average Rating Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Minimum Average Rating</Label>
            <RadioGroup
              value={pendingFilters.minRating?.toString() || "all"}
              onValueChange={(value) =>
                setPendingFilters({ ...pendingFilters, minRating: value === "all" ? null : parseInt(value) })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="rating-all" />
                <Label htmlFor="rating-all" className="font-normal cursor-pointer">
                  All Ratings
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4" id="rating-4" />
                <Label htmlFor="rating-4" className="font-normal cursor-pointer flex items-center gap-1">
                  4+ <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="rating-3" />
                <Label htmlFor="rating-3" className="font-normal cursor-pointer flex items-center gap-1">
                  3+ <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="rating-2" />
                <Label htmlFor="rating-2" className="font-normal cursor-pointer flex items-center gap-1">
                  2+ <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="rating-1" />
                <Label htmlFor="rating-1" className="font-normal cursor-pointer flex items-center gap-1">
                  1+ <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
