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
    city_id: string | null;
    city_name: string;
    state_region_id: string | null;
    state_name: string;
    country_id: string | null;
    country_name: string;
  }) => void;
  required?: boolean;
}

const FormCityCombobox = ({ value, onChange, required = false }: FormCityComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  const handleSelectFreeText = () => {
    if (searchTerm.trim()) {
      onChange({
        city_id: null,
        city_name: searchTerm.trim(),
        state_region_id: null,
        state_name: '',
        country_id: null,
        country_name: '',
      });
      setOpen(false);
      setSearchTerm("");
    }
  };

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
              {displayValue || "Saisir une ville..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Tapez le nom de la ville..." 
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
                  {/* Always show free text option when there's input */}
                  {searchTerm.trim().length >= 1 && (
                    <CommandGroup heading="Saisie libre">
                      <CommandItem
                        value={`free-${searchTerm}`}
                        onSelect={handleSelectFreeText}
                        className="py-3"
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        <span>Utiliser « <strong>{searchTerm.trim()}</strong> »</span>
                      </CommandItem>
                    </CommandGroup>
                  )}

                  {/* DB suggestions */}
                  {cities.length > 0 && (
                    <CommandGroup heading="Suggestions">
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
                                value?.city_id === city.id ? "opacity-100" : "opacity-0"
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
                  )}

                  {searchTerm.length < 2 && cities.length === 0 && (
                    <CommandEmpty>
                      <div className="py-6 text-center text-sm">
                        Tapez le nom de la ville pour rechercher ou saisir librement...
                      </div>
                    </CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <label className="absolute -top-2 left-4 text-xs text-primary bg-white px-2 pointer-events-none">
        Ville {required && "*"}
      </label>
    </div>
  );
};

export default FormCityCombobox;
