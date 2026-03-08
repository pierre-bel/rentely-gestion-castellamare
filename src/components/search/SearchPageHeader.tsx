import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, User, LogOut, MapPin, Calendar, Users, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AuthDialog } from "@/components/AuthDialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import DestinationAutocomplete from "@/components/search/DestinationAutocomplete";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SearchPageHeaderProps {
  searchQuery: {
    location: string;
    locationSearch: string;
    city_id: string | null;
    state_region_id: string | null;
    country_id: string | null;
    guests: string;
  };
  dateRange: DateRange | undefined;
  onSearchQueryChange: (query: { 
    location: string;
    locationSearch: string;
    city_id: string | null;
    state_region_id: string | null;
    country_id: string | null;
    guests: string;
  }) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onSearch: () => void;
}

const SearchPageHeader = ({
  searchQuery,
  dateRange,
  onSearchQueryChange,
  onDateRangeChange,
  onSearch
}: SearchPageHeaderProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin, isHost } = useUserRole();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  
  // Local state for buffering user input
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [localDateRange, setLocalDateRange] = useState(dateRange);

  // Sync local state when props change externally
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);

  const handleSearchClick = () => {
    onSearchQueryChange(localSearchQuery);
    onDateRangeChange(localDateRange);
    onSearch();
  };

  return (
    <nav className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-20 gap-4">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <Home className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl hidden sm:inline">Rentely</span>
          </Link>

          {/* Search Component */}
          <div className="flex-1 max-w-xl">
            <div className="rounded-full border bg-white p-1.5">
              <div className="flex items-center gap-1">
                {/* Destination */}
                <div className="flex-1 flex items-center gap-2 px-2 h-[36px] min-w-0">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <DestinationAutocomplete
                    value={localSearchQuery.location}
                    onChange={(destination) => setLocalSearchQuery({
                      ...localSearchQuery,
                      location: destination.displayText,
                      locationSearch: destination.searchValue,
                      city_id: destination.city_id || null,
                      state_region_id: destination.state_region_id || null,
                      country_id: destination.country_id || null,
                    })}
                    placeholder="Destination"
                    className="h-[36px]"
                  />
                </div>
                
                <div className="hidden sm:block h-6 w-px bg-border" />
                
                {/* Dates */}
                <div className="hidden sm:flex flex-1 items-center gap-2 px-2 h-[36px] min-w-0">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-auto p-0 hover:bg-transparent text-sm",
                          !localDateRange?.from && "text-muted-foreground"
                        )}
                      >
                        {localDateRange?.from ? (
                          localDateRange.to ? (
                            `${format(localDateRange.from, "MMM dd")} - ${format(localDateRange.to, "MMM dd")}`
                          ) : (
                            format(localDateRange.from, "MMM dd")
                          )
                        ) : (
                          <span>Dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center" sideOffset={12}>
                      <CalendarComponent
                        mode="range"
                        selected={localDateRange}
                        onSelect={setLocalDateRange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        numberOfMonths={2}
                        initialFocus
                        className="p-4 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                

                {/* Search Button */}
                <Button 
                  size="icon"
                  className="rounded-full h-[36px] w-[36px] flex-shrink-0" 
                  onClick={handleSearchClick}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side Navigation */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/" className="hidden lg:block text-sm font-medium hover:text-primary transition-colors">
              Book
            </Link>
            <Link to="/become-host" className="hidden lg:block text-sm font-medium hover:text-primary transition-colors">
              Become a Host
            </Link>
            <Link to="#" className="hidden lg:block text-sm font-medium hover:text-primary transition-colors">
              Help
            </Link>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100]">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/guest/dashboard">Guest Dashboard</Link>
                  </DropdownMenuItem>
                  {isHost && (
                    <DropdownMenuItem asChild>
                      <Link to="/host/dashboard">Host Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard">Admin Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" className="rounded-full" onClick={() => setAuthDialogOpen(true)}>
                Sign Up
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </nav>
  );
};

export default SearchPageHeader;
