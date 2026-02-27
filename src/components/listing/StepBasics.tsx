import { useState, useEffect } from "react";
import { ListingFormData } from "@/pages/host/CreateListing";
import FormInput from "./FormInput";
import FormCityCombobox from "./FormCityCombobox";
import LocationMap from "./LocationMap";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StepBasicsProps {
  formData: ListingFormData;
  updateFormData: (data: Partial<ListingFormData>) => void;
}

const StepBasics = ({ formData, updateFormData }: StepBasicsProps) => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCountries = async () => {
      const { data } = await supabase
        .from('countries')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setCountries(data.map(c => ({ value: c.name, label: c.name })));
      }
    };
    fetchCountries();
  }, []);

  const handleShowOnMap = async () => {
    // Check if required fields are filled
    if (!formData.country || !formData.address || !formData.city) {
      toast({
        title: "Missing Information",
        description: "Please fill in Street Address and City before showing on map",
        variant: "destructive",
      });
      return;
    }

    setIsGeocoding(true);

    try {
      // Use Nominatim geocoding with full address
      const addressParts = [
        formData.address,
        formData.city,
        formData.state,
        formData.postal_code,
        formData.country
      ].filter(Boolean).join(', ');

      const query = encodeURIComponent(addressParts);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'Rentely'
          }
        }
      );

      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        updateFormData({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        });
        toast({
          title: "Location Found",
          description: "Your property has been located on the map",
        });
      } else {
        toast({
          title: "Location Not Found",
          description: "Could not find this address. Please check the details and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Error",
        description: "Failed to find location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const canShowMap = formData.country && formData.address && formData.city;

  return (
    <div className="space-y-6">
      <FormCityCombobox
        value={
          formData.city_id ? {
            city_id: formData.city_id,
            city_name: formData.city,
            state_region_id: formData.state_region_id,
            state_name: formData.state,
            country_id: formData.country_id,
            country_name: formData.country,
          } : null
        }
        onChange={(cityData) => {
          updateFormData({
            city_id: cityData.city_id,
            city: cityData.city_name,
            state_region_id: cityData.state_region_id,
            state: cityData.state_name,
            country_id: cityData.country_id,
            country: cityData.country_name,
          });
        }}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Street Address"
          placeholder="123 Main Street"
          value={formData.address}
          onChange={(value) => updateFormData({ address: value })}
          required
        />
        <FormInput
          label="Postal Code"
          placeholder="08036"
          value={formData.postal_code}
          onChange={(value) => updateFormData({ postal_code: value })}
        />
      </div>

      <div className="flex items-center justify-between pt-4">
        <h3 className="text-xl font-semibold">Location</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShowOnMap}
          disabled={!canShowMap || isGeocoding}
        >
          {isGeocoding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Locating...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Show on map
            </>
          )}
        </Button>
      </div>

      {formData.latitude && formData.longitude && (
        <div className="mt-6">
          <LocationMap latitude={formData.latitude} longitude={formData.longitude} />
        </div>
      )}

      {!formData.latitude && !formData.longitude && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Click "Show on map" to verify your property location
        </p>
      )}
    </div>
  );
};

export default StepBasics;
