import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const MONTHS = [
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

const YEARS = Array.from(
  { length: new Date().getFullYear() - 2020 + 2 },
  (_, i) => 2020 + i
);

interface MonthRangePickerProps {
  startMonth: Date | null;
  endMonth: Date | null;
  onStartMonthChange: (date: Date | null) => void;
  onEndMonthChange: (date: Date | null) => void;
}

const MonthRangePicker = ({
  startMonth,
  endMonth,
  onStartMonthChange,
  onEndMonthChange,
}: MonthRangePickerProps) => {
  const startMonthValue = startMonth ? startMonth.getMonth().toString() : "";
  const startYearValue = startMonth ? startMonth.getFullYear().toString() : "";
  const endMonthValue = endMonth ? endMonth.getMonth().toString() : "";
  const endYearValue = endMonth ? endMonth.getFullYear().toString() : "";

  const handleStartMonthChange = (monthValue: string) => {
    const year = startMonth ? startMonth.getFullYear() : new Date().getFullYear();
    const newDate = new Date(year, parseInt(monthValue), 1);
    onStartMonthChange(newDate);
  };

  const handleStartYearChange = (yearValue: string) => {
    const month = startMonth ? startMonth.getMonth() : 0;
    const newDate = new Date(parseInt(yearValue), month, 1);
    onStartMonthChange(newDate);
  };

  const handleEndMonthChange = (monthValue: string) => {
    const year = endMonth ? endMonth.getFullYear() : new Date().getFullYear();
    const newDate = new Date(year, parseInt(monthValue), 1);
    onEndMonthChange(newDate);
  };

  const handleEndYearChange = (yearValue: string) => {
    const month = endMonth ? endMonth.getMonth() : 0;
    const newDate = new Date(parseInt(yearValue), month, 1);
    onEndMonthChange(newDate);
  };

  const isEndMonthDisabled = (monthIndex: number, year: number) => {
    if (!startMonth) return false;
    const testDate = new Date(year, monthIndex, 1);
    return testDate < startMonth;
  };

  return (
    <div className="space-y-4">
      {/* Start Month */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Start Month</Label>
        <div className="grid grid-cols-2 gap-3">
          <Select value={startMonthValue} onValueChange={handleStartMonthChange}>
            <SelectTrigger>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={startYearValue} onValueChange={handleStartYearChange}>
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* End Month */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">End Month</Label>
        <div className="grid grid-cols-2 gap-3">
          <Select value={endMonthValue} onValueChange={handleEndMonthChange}>
            <SelectTrigger>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem
                  key={month.value}
                  value={month.value}
                  disabled={
                    endYearValue &&
                    isEndMonthDisabled(parseInt(month.value), parseInt(endYearValue))
                  }
                >
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={endYearValue} onValueChange={handleEndYearChange}>
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected Range Display */}
      {startMonth && endMonth && (
        <div className="text-center p-3 bg-muted/50 rounded-md">
          <p className="text-sm font-medium">
            {format(startMonth, "MMM yyyy")} - {format(endMonth, "MMM yyyy")}
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthRangePicker;
