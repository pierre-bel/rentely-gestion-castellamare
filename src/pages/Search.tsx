import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { X, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import SearchPageHeader from "@/components/search/SearchPageHeader";
import SearchResultsMap from "@/components/search/SearchResultsMap";
import ListingCard from "@/components/shared/ListingCard";
import HorizontalListingCard from "@/components/search/HorizontalListingCard";
import SearchPageFooter from "@/components/search/SearchPageFooter";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Filters {
  priceRange: [number, number];
  bedrooms: string;
  bathrooms: string;
  propertyType: string;
  amenities: string[];
}

const DEFAULT_FILTERS: Filters = {
  priceRange: [0, 1000],
  bedrooms: "any",
  bathrooms: "any",
  propertyType: "all",
  amenities: []
};

const AMENITIES = [
  "WiFi",
  "Kitchen",
  "Parking",
  "Pool",
  "Air Conditioning",
  "Heating",
  "TV",
  "Washer",
  "Dryer",
  "Gym"
];

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Initialize search query from URL params
  const [searchQuery, setSearchQuery] = useState({
    location: searchParams.get("location") || "",
    locationSearch: searchParams.get("location") || "",
    city_id: searchParams.get("city_id") || null,
    state_region_id: searchParams.get("state_region_id") || null,
    country_id: searchParams.get("country_id") || null,
    guests: searchParams.get("guests") || ""
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    if (checkIn && checkOut) {
      return {
        from: new Date(checkIn),
        to: new Date(checkOut)
      };
    }
    return undefined;
  });
  
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('search-listings', {
          body: {
            location: searchQuery.locationSearch,
            city_id: searchQuery.city_id,
            state_region_id: searchQuery.state_region_id,
            country_id: searchQuery.country_id,
            checkIn: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
            checkOut: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
            guests: (searchQuery.guests && parseInt(searchQuery.guests) > 0) ? parseInt(searchQuery.guests) : null,
            priceMin: filters.priceRange[0],
            priceMax: filters.priceRange[1],
            bedrooms: filters.bedrooms,
            bathrooms: filters.bathrooms,
            propertyType: filters.propertyType,
            amenities: filters.amenities,
          }
        });
        
        if (error) {
          console.error('Error fetching listings:', error);
        } else if (data) {
          setListings(data.listings || []);
        }
      } catch (error) {
        console.error('Error calling search function:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [searchQuery, dateRange, filters]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.locationSearch) params.set("location", searchQuery.locationSearch);
    if (searchQuery.city_id) params.set("city_id", searchQuery.city_id);
    if (searchQuery.state_region_id) params.set("state_region_id", searchQuery.state_region_id);
    if (searchQuery.country_id) params.set("country_id", searchQuery.country_id);
    if (dateRange?.from) params.set("checkIn", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange?.to) params.set("checkOut", format(dateRange.to, "yyyy-MM-dd"));
    if (searchQuery.guests && parseInt(searchQuery.guests) > 0) params.set("guests", searchQuery.guests);
    setSearchParams(params);
    
    // The useEffect hook will automatically trigger the search when searchQuery, dateRange, or filters change
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const activeFilterCount = 
    (filters.bedrooms && filters.bedrooms !== "any" ? 1 : 0) +
    (filters.bathrooms && filters.bathrooms !== "any" ? 1 : 0) +
    (filters.propertyType && filters.propertyType !== "all" ? 1 : 0) +
    filters.amenities.length;

  // Format the title based on search params
  const getTitleText = () => {
    const parts = [];
    
    if (dateRange?.from) {
      const fromDate = format(dateRange.from, "MMM d");
      const toDate = dateRange.to ? format(dateRange.to, "MMM d, yyyy") : format(dateRange.from, "MMM d, yyyy");
      parts.push(`${fromDate}-${toDate}`);
    }
    
    if (searchQuery.location) {
      parts.push(searchQuery.location);
    }
    
    return parts.length > 0 ? parts.join(" • ") : "All Properties";
  };

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-white">
      {/* Search Header */}
      <SearchPageHeader 
        searchQuery={searchQuery}
        dateRange={dateRange}
        onSearchQueryChange={setSearchQuery}
        onDateRangeChange={setDateRange}
        onSearch={handleSearch}
      />

      <div className="flex flex-col lg:flex-row">
        {/* Left Column - Scrollable Content */}
        <div className={cn(
          "w-full bg-white",
          "lg:w-[776px]"
        )}>
          <div className="px-6 pt-8">
            {/* Results Header */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Search Results</p>
              <h1 className="text-[48px] font-medium text-primary leading-tight mb-2">
                {getTitleText()}
              </h1>
              {searchQuery.guests && (
                <p className="text-2xl text-foreground">
                  {searchQuery.guests} {Number(searchQuery.guests) === 1 ? 'Guest' : 'Guests'}
                </p>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between mb-6">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Refine your search with additional criteria
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-6 mt-6">
                    {/* Price Range */}
                    <div>
                      <Label>Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}/night</Label>
                      <Slider
                        value={filters.priceRange}
                        onValueChange={(value) => setFilters({ ...filters, priceRange: value as [number, number] })}
                        max={1000}
                        step={10}
                        className="mt-2"
                      />
                    </div>

                    {/* Property Type */}
                    <div>
                      <Label htmlFor="propertyType">Property Type</Label>
                      <Select
                        value={filters.propertyType}
                        onValueChange={(value) => setFilters({ ...filters, propertyType: value })}
                      >
                        <SelectTrigger id="propertyType">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="villa">Villa</SelectItem>
                          <SelectItem value="room">Room</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="condo">Condo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bedrooms */}
                    <div>
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Select
                        value={filters.bedrooms}
                        onValueChange={(value) => setFilters({ ...filters, bedrooms: value })}
                      >
                        <SelectTrigger id="bedrooms">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1">1+</SelectItem>
                          <SelectItem value="2">2+</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bathrooms */}
                    <div>
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Select
                        value={filters.bathrooms}
                        onValueChange={(value) => setFilters({ ...filters, bathrooms: value })}
                      >
                        <SelectTrigger id="bathrooms">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1">1+</SelectItem>
                          <SelectItem value="2">2+</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amenities */}
                    <div>
                      <Label className="mb-3 block">Amenities</Label>
                      <div className="space-y-2">
                        {AMENITIES.map((amenity) => (
                          <div key={amenity} className="flex items-center space-x-2">
                            <Checkbox
                              id={amenity}
                              checked={filters.amenities.includes(amenity)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters({
                                    ...filters,
                                    amenities: [...filters.amenities, amenity]
                                  });
                                } else {
                                  setFilters({
                                    ...filters,
                                    amenities: filters.amenities.filter(a => a !== amenity)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={amenity} className="cursor-pointer">
                              {amenity}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {activeFilterCount > 0 && (
                      <Button onClick={clearFilters} variant="outline" className="w-full">
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Gray Container - Listings Only */}
            <div className="bg-[#F8FAFF] rounded-2xl p-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                 ) : listings.length === 0 ? (
                   <div className="text-center py-12 text-muted-foreground">
                     No properties match your filters. Try adjusting your search criteria.
                   </div>
                 ) : (
                   listings.map((listing) => (
                     <div key={listing.id}>
                       {isMobile ? (
                         <ListingCard listing={listing} />
                       ) : (
                         <HorizontalListingCard 
                           listing={listing}
                           dateRange={dateRange}
                         />
                       )}
                     </div>
                   ))
                 )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Sticky Map (hidden on mobile/tablet) */}
        <div className="hidden lg:block flex-1">
          <div className="sticky top-20 h-[calc(100vh-80px)] p-6">
            <SearchResultsMap listings={listings} dateRange={dateRange} />
          </div>
        </div>
      </div>

      {/* Footer - Full Width */}
      <SearchPageFooter />
    </div>
  );
};

export default Search;
