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
    if (!formData.country || !formData.address || !formData.city) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir l'adresse et la ville avant d'afficher sur la carte",
        variant: "destructive",
      });
      return;
    }

    setIsGeocoding(true);

    try {
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
          title: "Localisation trouvée",
          description: "Votre bien a été localisé sur la carte",
        });
      } else {
        toast({
          title: "Localisation introuvable",
          description: "Impossible de trouver cette adresse. Vérifiez les informations et réessayez.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de localiser l'adresse. Veuillez réessayer.",
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
          formData.city ? {
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
          label="Adresse"
          placeholder="123 Rue Principale"
          value={formData.address}
          onChange={(value) => updateFormData({ address: value })}
          required
        />
        <FormInput
          label="Code postal"
          placeholder="75001"
          value={formData.postal_code}
          onChange={(value) => updateFormData({ postal_code: value })}
        />
      </div>

      <div className="flex items-center justify-between pt-4">
        <h3 className="text-xl font-semibold">Localisation</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShowOnMap}
          disabled={!canShowMap || isGeocoding}
        >
          {isGeocoding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recherche...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Voir sur la carte
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
          Cliquez sur « Voir sur la carte » pour vérifier la localisation de votre bien
        </p>
      )}
    </div>
  );
};

export default StepBasics;
