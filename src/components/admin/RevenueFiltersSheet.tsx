import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RevenueFiltersSheetProps {
  startDate: Date;
  endDate: Date;
  onApplyFilters: (startDate: Date, endDate: Date) => void;
  onClearFilters: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RevenueFiltersSheet({
  startDate,
  endDate,
  onApplyFilters,
  onClearFilters,
  open,
  onOpenChange,
}: RevenueFiltersSheetProps) {
  // Local state for temporary filter values
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  // Sync with parent when sheet opens
  useEffect(() => {
    if (open) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    }
  }, [open, startDate, endDate]);

  const setPresetRange = (preset: string) => {
    const today = new Date();
    let newStartDate = new Date();

    switch (preset) {
      case "last-week":
        newStartDate.setDate(today.getDate() - 7);
        break;
      case "last-month":
        newStartDate.setMonth(today.getMonth() - 1);
        break;
      case "last-quarter":
        newStartDate.setMonth(today.getMonth() - 3);
        break;
      case "last-year":
        newStartDate.setFullYear(today.getFullYear() - 1);
        break;
      case "all-time":
        newStartDate = new Date(2020, 0, 1);
        break;
    }

    setTempStartDate(newStartDate);
    setTempEndDate(today);
  };

  const handleApply = () => {
    onApplyFilters(tempStartDate, tempEndDate);
    onOpenChange(false);
  };

  const handleClear = () => {
    onClearFilters();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Revenue Report</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Preset Buttons */}
          <div>
            <Label className="mb-3 block">Quick Ranges</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="bg-white" onClick={() => setPresetRange("last-week")}>
                Last Week
              </Button>
              <Button variant="outline" size="sm" className="bg-white" onClick={() => setPresetRange("last-month")}>
                Last Month
              </Button>
              <Button variant="outline" size="sm" className="bg-white" onClick={() => setPresetRange("last-quarter")}>
                Last Quarter
              </Button>
              <Button variant="outline" size="sm" className="bg-white" onClick={() => setPresetRange("last-year")}>
                Last Year
              </Button>
              <Button variant="outline" size="sm" className="col-span-2 bg-white" onClick={() => setPresetRange("all-time")}>
                All Time
              </Button>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <Label className="mb-2 block">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white",
                  !tempStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {tempStartDate ? format(tempStartDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={tempStartDate}
                onSelect={(date) => date && setTempStartDate(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          </div>

          {/* End Date */}
          <div>
            <Label className="mb-2 block">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white",
                  !tempEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {tempEndDate ? format(tempEndDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={tempEndDate}
                onSelect={(date) => date && setTempEndDate(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleClear}>
            Clear All
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
