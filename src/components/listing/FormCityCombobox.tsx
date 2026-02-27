import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface CityOption {
  id: string;
  name: string;
  state_region_id: string | null;
  state_name: string;
  country_id: string;
  country_name: string;
  country_code: string;
}

interface FormCityComboboxProps {
  value: {
    city_id: string | null;
    city_name: string;
    state_region_id: string | null;
    state_name: string;
    country_id: string | null;
    country_name: string;
  } | null;
  onChange: (cityData: {
    city_id: string;
    city_name: string;
    state_region_id: string | null;
    state_name: string;
    country_id: string;
    country_name: string;
  }) => void;
  required?: boolean;
}

const FormCityCombobox = ({ value, onChange, required = false }: FormCityComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualCountry, setManualCountry] = useState("");
  
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    const searchCities = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setCities([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('cities')
          .select(`
            id,
            name,
            state_region_id,
            states_regions (
              id,
              name
            ),
            country_id,
            countries (
              id,
              name,
              code
            )
          `)
          .ilike('name', `%${debouncedSearch}%`)
          .eq('is_active', true)
          .order('name')
          .limit(20);

        if (error) throw error;

        const formattedCities: CityOption[] = (data || []).map((city: any) => ({
          id: city.id,
          name: city.name,
          state_region_id: city.state_region_id,
          state_name: city.states_regions?.name || '',
          country_id: city.country_id,
          country_name: city.countries?.name || '',
          country_code: city.countries?.code || '',
        }));

        setCities(formattedCities);
      } catch (error) {
        console.error('Error searching cities:', error);
        setCities([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchCities();
  }, [debouncedSearch]);

  const displayValue = value?.city_name || "";
  const selectedCityId = value?.city_id;

  const handleManualSubmit = () => {
    if (manualCity.trim() && manualCountry.trim()) {
      onChange({
        city_id: '',
        city_name: manualCity.trim(),
        state_region_id: null,
        state_name: manualState.trim(),
        country_id: '',
        country_name: manualCountry.trim(),
      });
      setShowManualEntry(false);
      setManualCity("");
      setManualState("");
      setManualCountry("");
      setOpen(false);
    }
  };

  if (showManualEntry) {
    return (
      <div className="relative space-y-4">
        <div className="relative">
          <input
            type="text"
            value={manualCity}
            onChange={(e) => setManualCity(e.target.value)}
            placeholder="City name"
            className="h-14 w-full rounded-full px-6 border border-[#D5DAE7] bg-white text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
          />
          <label className="absolute -top-2 left-4 text-xs text-primary bg-white px-2 pointer-events-none">
            City {required && "*"}
          </label>
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={manualState}
            onChange={(e) => setManualState(e.target.value)}
            placeholder="State/Region (optional)"
            className="h-14 w-full rounded-full px-6 border border-[#D5DAE7] bg-white text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
          />
          <label className="absolute -top-2 left-4 text-xs text-primary bg-white px-2 pointer-events-none">
            State/Region
          </label>
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={manualCountry}
            onChange={(e) => setManualCountry(e.target.value)}
            placeholder="Country"
            className="h-14 w-full rounded-full px-6 border border-[#D5DAE7] bg-white text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
          />
          <label className="absolute -top-2 left-4 text-xs text-primary bg-white px-2 pointer-events-none">
            Country {required && "*"}
          </label>
        </div>
        
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleManualSubmit}
            disabled={!manualCity.trim() || !manualCountry.trim()}
            className="flex-1"
          >
            Save Location
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowManualEntry(false);
              setManualCity("");
              setManualState("");
              setManualCountry("");
            }}
          >
            Search Database
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-14 w-full rounded-full px-6 border-[#D5DAE7] bg-white text-base justify-between hover:bg-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className={cn(
              displayValue ? "text-foreground" : "text-muted-foreground"
            )}>
              {displayValue || "Select city..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search cities..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {searchTerm.length < 2 ? (
                      <div className="py-6 text-center text-sm">
                        Type at least 2 characters to search...
                      </div>
                    ) : (
                      <div className="py-6 px-4 space-y-3">
                        <p className="text-center text-sm text-muted-foreground">
                          No cities found in our database.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setShowManualEntry(true);
                            setManualCity(searchTerm);
                            setOpen(false);
                          }}
                        >
                          Enter "{searchTerm}" manually
                        </Button>
                      </div>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {cities.map((city) => (
                      <CommandItem
                        key={city.id}
                        value={city.id}
                        onSelect={() => {
                          onChange({
                            city_id: city.id,
                            city_name: city.name,
                            state_region_id: city.state_region_id,
                            state_name: city.state_name,
                            country_id: city.country_id,
                            country_name: city.country_name,
                          });
                          setOpen(false);
                          setSearchTerm("");
                        }}
                        className="flex flex-col items-start py-3"
                      >
                        <div className="flex items-center w-full">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCityId === city.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-base">
                              {city.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {city.state_name ? `${city.state_name}, ` : ''}{city.country_name}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Floating label */}
      <label className="absolute -top-2 left-4 text-xs text-primary bg-white px-2 pointer-events-none">
        City {required && "*"}
      </label>
    </div>
  );
};

export default FormCityCombobox;
