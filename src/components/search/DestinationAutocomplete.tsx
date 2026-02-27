import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DestinationResult {
  id: string;
  type: 'city' | 'state' | 'country';
  name: string;
  stateName?: string;
  countryName: string;
  city_id?: string;
  state_region_id?: string;
  country_id?: string;
}

interface DestinationAutocompleteProps {
  value: string;
  onChange: (destination: {
    displayText: string;
    searchValue: string;
    city_id?: string;
    state_region_id?: string;
    country_id?: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

export default function DestinationAutocomplete({
  value,
  onChange,
  placeholder = "Destination",
  className
}: DestinationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [results, setResults] = useState<DestinationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const searchDestinations = async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const searchPattern = `%${debouncedSearchTerm}%`;

        // Search cities
        const { data: cities } = await supabase
          .from('cities')
          .select(`
            id,
            name,
            state_region_id,
            states_regions (id, name),
            country_id,
            countries (id, name, code)
          `)
          .ilike('name', searchPattern)
          .eq('is_active', true)
          .order('name')
          .limit(8);

        // Search states/regions
        const { data: states } = await supabase
          .from('states_regions')
          .select(`
            id,
            name,
            country_id,
            countries (id, name, code)
          `)
          .ilike('name', searchPattern)
          .eq('is_active', true)
          .order('name')
          .limit(5);

        // Search countries
        const { data: countries } = await supabase
          .from('countries')
          .select('id, name, code')
          .ilike('name', searchPattern)
          .eq('is_active', true)
          .order('name')
          .limit(3);

        // Format results
        const formattedResults: DestinationResult[] = [];

        // Add city results
        cities?.forEach((city: any) => {
          formattedResults.push({
            id: city.id,
            type: 'city',
            name: city.name,
            stateName: city.states_regions?.name,
            countryName: city.countries?.name || '',
            city_id: city.id,
            state_region_id: city.state_region_id,
            country_id: city.country_id,
          });
        });

        // Add state results
        states?.forEach((state: any) => {
          formattedResults.push({
            id: state.id,
            type: 'state',
            name: state.name,
            countryName: state.countries?.name || '',
            state_region_id: state.id,
            country_id: state.country_id,
          });
        });

        // Add country results
        countries?.forEach((country: any) => {
          formattedResults.push({
            id: country.id,
            type: 'country',
            name: country.name,
            countryName: country.name,
            country_id: country.id,
          });
        });

        setResults(formattedResults);
        setIsOpen(formattedResults.length > 0);
      } catch (error) {
        console.error('Error searching destinations:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchDestinations();
  }, [debouncedSearchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: DestinationResult) => {
    let displayText = result.name;
    let searchValue = result.name;

    if (result.type === 'city') {
      if (result.stateName) {
        displayText = `${result.name}, ${result.stateName}, ${result.countryName}`;
        searchValue = `${result.name}, ${result.stateName}, ${result.countryName}`;
      } else {
        displayText = `${result.name}, ${result.countryName}`;
        searchValue = `${result.name}, ${result.countryName}`;
      }
    } else if (result.type === 'state') {
      displayText = `${result.name}, ${result.countryName}`;
      searchValue = `${result.name}, ${result.countryName}`;
    } else {
      displayText = result.name;
      searchValue = result.name;
    }

    setSearchTerm(displayText);
    onChange({
      displayText,
      searchValue,
      city_id: result.city_id,
      state_region_id: result.state_region_id,
      country_id: result.country_id,
    });
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        className={cn("border-0 bg-transparent focus-visible:ring-0 p-0 text-sm", className)}
      />

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto min-w-[320px] sm:min-w-[380px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-4 px-4 text-sm text-muted-foreground text-center">
              {debouncedSearchTerm.length < 2 ? 'Type at least 2 characters' : 'No destinations found'}
            </div>
          ) : (
            <div className="py-1">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-accent transition-colors cursor-pointer flex items-start gap-3",
                    selectedIndex === index && "bg-accent"
                  )}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{result.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.type === 'city' && result.stateName
                        ? `${result.stateName}, ${result.countryName}`
                        : result.type === 'city'
                        ? result.countryName
                        : result.type === 'state'
                        ? result.countryName
                        : 'All locations'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
