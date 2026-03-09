import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemoData } from "@/hooks/useDemoData";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft } from "lucide-react";
import StepBasics from "@/components/listing/StepBasics";
import StepPropertyType from "@/components/listing/StepPropertyType";
import StepRooms from "@/components/listing/StepRooms";
import StepDetails from "@/components/listing/StepDetails";
import StepPhotos from "@/components/listing/StepPhotos";
import StepRules from "@/components/listing/StepRules";
import StepPricing from "@/components/listing/StepPricing";
import StepReview from "@/components/listing/StepReview";
import StepAvailability from "@/components/listing/StepAvailability";
import type { RoomData } from "@/components/listing/StepRooms";

export type AvailabilityRule = {
  id: string;
  startDate: string;
  endDate: string;
  price: number | null;
};

export type ListingFormData = {
  // Address
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  
  // Location foreign keys
  city_id: string | null;
  state_region_id: string | null;
  country_id: string | null;
  
  // Property Type
  title: string;
  description: string;
  type: string;
  guests_max: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  square_feet: number;
  
  // Details
  amenities: string[];
  
  // Photos
  cover_image: string;
  images: string[];
  
  // Rules
  check_in_time: string;
  check_out_time: string;
  min_nights: number;
  max_nights: number;
  house_rules: string;
  cancellation_policy_id: string | null;
  cleaning_fee: number | null;
  
  // Pricing
  base_price: number;
  weekly_discount: number;
  monthly_discount: number;
  
  // Rooms
  rooms: RoomData[];
  
  // Availability
  availability_rules: AvailabilityRule[];
}

const STEPS = ["Adresse", "Type de bien", "Pièces", "Photos", "Équipements", "Règles", "Tarifs", "Disponibilité", "Récapitulatif"];

const CreateListing = () => {
  const { user } = useAuth();
  const { isDemoMode, addListing, addAvailabilityRules, migrationComplete } = useDemoData();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ListingFormData>({
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "USA",
    latitude: null,
    longitude: null,
    city_id: null,
    state_region_id: null,
    country_id: null,
    title: "",
    description: "",
    type: "apartment",
    guests_max: 1,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    square_feet: 0,
    amenities: [],
    cover_image: "",
    images: [],
    check_in_time: "14:00",
    check_out_time: "11:00",
    min_nights: 1,
    max_nights: 30,
    house_rules: "",
    cancellation_policy_id: null,
    cleaning_fee: null,
    base_price: 0,
    weekly_discount: 0,
    monthly_discount: 0,
    rooms: [],
    availability_rules: [],
  });

  const updateFormData = (data: Partial<ListingFormData>) => {
    setFormData({ ...formData, ...data });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Phase 1: Validation
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer une annonce",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (isDemoMode && !migrationComplete) {
      toast({
        title: "Veuillez patienter",
        description: "Les données de démonstration sont en cours de chargement...",
        variant: "default",
      });
      setLoading(false);
      return;
    }

    try {
      if (isDemoMode) {
        // DEMO MODE: Save to localStorage
        const newListingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const demoListing = {
          id: newListingId,
          host_user_id: user.id,
          status: 'approved',
          title: formData.title,
          description: formData.description,
          type: formData.type,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
          latitude: formData.latitude,
          longitude: formData.longitude,
          city_id: formData.city_id,
          state_region_id: formData.state_region_id,
          country_id: formData.country_id,
          guests_max: formData.guests_max,
          bedrooms: formData.bedrooms,
          beds: formData.beds,
          bathrooms: formData.bathrooms,
          size_sqft: formData.square_feet,
          amenities: formData.amenities,
          cover_image: formData.cover_image,
          images: formData.images,
          checkin_from: formData.check_in_time,
          checkout_until: formData.check_out_time,
          min_nights: formData.min_nights,
          max_nights: formData.max_nights,
          house_rules: formData.house_rules,
          cancellation_policy_id: formData.cancellation_policy_id,
          base_price: formData.base_price,
          weekly_discount: formData.weekly_discount,
          monthly_discount: formData.monthly_discount,
          cleaning_fee: formData.cleaning_fee ?? 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        addListing(demoListing);
        
        if (formData.availability_rules && formData.availability_rules.length > 0) {
          const availabilityRecords = formData.availability_rules.map(rule => ({
            start_date: rule.startDate,
            end_date: rule.endDate,
            price: rule.price,
          }));
          addAvailabilityRules(newListingId, availabilityRecords);
        }
        
        // INVALIDATE CACHE to refresh all listing queries
        queryClient.invalidateQueries({ queryKey: ["host-listings"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent-listings"] });
        
        setLoading(false);
        toast({
          title: "Succès !",
      description: "Votre annonce a été créée et publiée avec succès",
        });
        navigate("/host/dashboard");
        return;
      }

      // REAL MODE: Existing Supabase logic
      const listingData = {
        host_user_id: user.id,
        title: formData.title,
        description: formData.description,
        type: formData.type as any,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        latitude: formData.latitude,
        longitude: formData.longitude,
        city_id: formData.city_id || null,
        state_region_id: formData.state_region_id || null,
        country_id: formData.country_id || null,
        guests_max: formData.guests_max,
        bedrooms: formData.bedrooms,
        beds: formData.beds,
        bathrooms: formData.bathrooms,
        size_sqft: formData.square_feet,
        amenities: formData.amenities,
        cover_image: formData.cover_image,
        images: formData.images,
        checkin_from: formData.check_in_time,
        checkout_until: formData.check_out_time,
        min_nights: formData.min_nights,
        max_nights: formData.max_nights,
        house_rules: formData.house_rules,
        cancellation_policy_id: formData.cancellation_policy_id,
        base_price: formData.base_price,
        weekly_discount: formData.weekly_discount,
        monthly_discount: formData.monthly_discount,
        cleaning_fee: formData.cleaning_fee ?? 0,
        status: "approved" as any,
      };

      const { data: createdListing, error: listingError } = await supabase
        .from("listings")
        .insert([listingData])
        .select()
        .single();

      if (listingError) {
        setLoading(false);
        toast({
          title: "Erreur",
          description: listingError.message,
          variant: "destructive",
        });
        return;
      }

      if (!createdListing || !createdListing.id) {
        setLoading(false);
        toast({
          title: "Erreur",
          description: "L'annonce a été créée mais l'identifiant est manquant",
          variant: "destructive",
        });
        return;
      }

      // Phase 3: Handle availability rules if they exist
      if (formData.availability_rules && formData.availability_rules.length > 0) {
        const availabilityRecords = formData.availability_rules.map(rule => ({
          listing_id: createdListing.id,
          start_date: rule.startDate,
          end_date: rule.endDate,
          price: rule.price,
        }));

        const { error: availabilityError } = await supabase
          .from("listing_availability")
          .insert(availabilityRecords);

        if (availabilityError) {
          setLoading(false);
          toast({
            title: "Succès partiel",
            description: "Votre annonce a été créée, mais les règles de disponibilité n'ont pas pu être enregistrées. Vous pourrez les ajouter en modifiant l'annonce.",
            variant: "destructive",
          });
          navigate("/host/dashboard");
          return;
        }
      }

      setLoading(false);
      toast({
        title: "Succès !",
        description: "Votre annonce a été créée et publiée avec succès",
      });
      navigate("/host/dashboard");

    } catch (error) {
      // Catch any unexpected errors
      setLoading(false);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => {
            const from = (location.state as any)?.from;
            navigate(from || "/host/listings");
          }}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Créer une annonce</CardTitle>
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Étape {currentStep + 1} sur {STEPS.length} : {STEPS[currentStep]}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 0 && (
              <StepBasics formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 1 && (
              <StepPropertyType formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 2 && (
              <StepPhotos formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 3 && (
              <StepDetails formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 4 && (
              <StepRules formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 5 && (
              <StepPricing formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 6 && (
              <StepAvailability formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 7 && <StepReview formData={formData} />}

            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0 || loading}
              >
                Précédent
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button 
                  onClick={handleNext} 
                  disabled={loading}
                >
                  Suivant
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Soumettre pour examen"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateListing;
