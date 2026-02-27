import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, ChevronDown, Loader2, MapPin, Star, X } from "lucide-react";
import { format, subYears } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CityOption, DetailedReviewExport } from "./types/reviews-report";

interface CustomReviewsReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomReviewsReportDialog({ open, onOpenChange }: CustomReviewsReportDialogProps) {
  const [startDate, setStartDate] = useState<Date>(subYears(new Date(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [dateError, setDateError] = useState("");
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);

  const { data: cities = [], isLoading: isLoadingCities } = useQuery({
    queryKey: ["admin-cities-for-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select(`
          id,
          name,
          countries!inner(name)
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      return (data || []).map((city: any) => ({
        id: city.id,
        name: city.name,
        country_name: city.countries.name,
      })) as CityOption[];
    },
  });

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setDateError("Start date must be before end date");
    } else {
      setDateError("");
    }
  }, [startDate, endDate]);

  const filteredCities = cities.filter((city) =>
    citySearchTerm
      ? city.name.toLowerCase().includes(citySearchTerm.toLowerCase()) ||
        city.country_name.toLowerCase().includes(citySearchTerm.toLowerCase())
      : true
  );

  const toggleCity = (cityId: string) => {
    setSelectedCities((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]
    );
  };

  const toggleRating = (rating: number) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating].sort()
    );
  };

  const getSelectedRatingsDescription = () => {
    if (selectedRatings.length === 0) return "All ratings";
    if (selectedRatings.length === 5) return "All ratings";
    const sorted = [...selectedRatings].sort();
    return `${sorted.map(r => `${r}★`).join(", ")}`;
  };

  const escapeCsvField = (value: string | number | null): string => {
    if (value === null) return "";
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExport = async () => {
    if (dateError) {
      toast.error("Please fix date range errors");
      return;
    }

    setIsExporting(true);

    try {
      setIsExporting(true);
      
      const { data, error } = await supabase.rpc("admin_export_reviews_custom_report", {
        p_start_date: format(startDate, "yyyy-MM-dd"),
        p_end_date: format(endDate, "yyyy-MM-dd"),
        p_city_ids: selectedCities.length > 0 ? selectedCities : null,
        p_min_ratings: selectedRatings.length > 0 && selectedRatings.length < 5 ? selectedRatings : null,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.warning("No reviews found matching your criteria. Try adjusting your filters.");
        setIsExporting(false);
        return;
      }

      // Generate CSV
      const headers = [
        "Listing ID",
        "Listing Name",
        "City",
        "Country",
        "User Name",
        "Review Text",
        "Rating",
        "Review Creation Date",
      ];

      const rows = (data as DetailedReviewExport[]).map((row) => [
        row.listing_id,
        escapeCsvField(row.listing_name),
        escapeCsvField(row.city_name),
        escapeCsvField(row.country_name),
        escapeCsvField(row.user_full_name),
        escapeCsvField(row.review_text),
        row.rating.toString(),
        format(new Date(row.review_created_at), "yyyy-MM-dd h:mm:ss a"),
      ]);

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      // Trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reviews_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} reviews successfully`);
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Custom Reviews Report</DialogTitle>
          <DialogDescription>
            Select filters to export detailed review data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Date Range Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Date Range</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {dateError && <p className="text-xs text-destructive">{dateError}</p>}
          </div>

          {/* City Multi-Select Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Cities (Optional)</label>
              {selectedCities.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCities([])}
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              )}
            </div>
            <Popover open={citiesOpen} onOpenChange={setCitiesOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-white">
                  <span className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    {selectedCities.length === 0 && "Select cities..."}
                    {selectedCities.length > 0 && `${selectedCities.length} cities selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 bg-white" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search cities..."
                    value={citySearchTerm}
                    onValueChange={setCitySearchTerm}
                  />
                  <CommandList>
                    {isLoadingCities ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No cities found.</CommandEmpty>
                        <CommandGroup>
                          {filteredCities.map((city) => (
                            <CommandItem
                              key={city.id}
                              onSelect={() => toggleCity(city.id)}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedCities.includes(city.id)}
                                className="mr-2"
                              />
                              <span>
                                {city.name}, {city.country_name}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Rating Filter Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Rating (Optional)</label>
              {selectedRatings.length > 0 && selectedRatings.length < 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRatings([])}
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              )}
            </div>
            <Popover open={ratingsOpen} onOpenChange={setRatingsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-white">
                  <span className="flex items-center">
                    <Star className="mr-2 h-4 w-4" />
                    {selectedRatings.length === 0 || selectedRatings.length === 5
                      ? "All ratings"
                      : `${selectedRatings.length} rating${selectedRatings.length > 1 ? 's' : ''} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0 bg-white" align="start">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <CommandItem
                          key={rating}
                          onSelect={() => toggleRating(rating)}
                          className="cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedRatings.includes(rating)}
                            className="mr-2"
                          />
                          <span className="flex items-center">
                            {rating}
                            <Star className="ml-1 h-3 w-3 fill-current" />
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !!dateError}>
            {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isExporting ? "Exporting..." : "Export to CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
