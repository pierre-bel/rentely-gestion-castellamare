import { ListingFormData } from "@/pages/host/CreateListing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, BedDouble, Bed, Bath, Ruler } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import LocationMap from "./LocationMap";
import PriceSummaryTable from "@/components/shared/PriceSummaryTable";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StepReviewProps {
  formData: ListingFormData;
}

const StepReview = ({ formData }: StepReviewProps) => {
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [policyName, setPolicyName] = useState<string>("");
  
  useEffect(() => {
    const fetchPolicyName = async () => {
      if (formData.cancellation_policy_id) {
        const { data } = await supabase
          .from('cancellation_policies')
          .select('name')
          .eq('id', formData.cancellation_policy_id)
          .single();
        if (data) setPolicyName(data.name);
      }
    };
    fetchPolicyName();
  }, [formData.cancellation_policy_id]);
  
  const allImages = formData.cover_image 
    ? [formData.cover_image, ...formData.images]
    : formData.images;

  const maxVisibleAmenities = 10;
  const displayedAmenities = showAllAmenities 
    ? formData.amenities 
    : formData.amenities.slice(0, maxVisibleAmenities);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Vérifiez toutes les informations avant de soumettre
        </p>
      </div>

      {allImages.length > 0 && (
        <div className="space-y-4">
          <Carousel className="w-full" opts={{ align: "start", loop: false }}>
            <CarouselContent className="-ml-2 md:-ml-4">
              {allImages.map((image, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 basis-full md:basis-1/3">
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                    <img src={image} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 0 && (
                      <Badge className="absolute top-4 left-4 bg-background/80 text-foreground">Couverture</Badge>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {allImages.length > 3 && (
              <>
                <CarouselPrevious className="left-0 -translate-x-1/2 top-1/2 -translate-y-1/2" />
                <CarouselNext className="right-0 translate-x-1/2 top-1/2 -translate-y-1/2" />
              </>
            )}
          </Carousel>
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Titre de l'annonce</p>
            <p className="text-base">{formData.title}</p>
          </div>
          {formData.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-base">{formData.description}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-muted-foreground" />
              <span className="text-base">{formData.bedrooms} chambre(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-muted-foreground" />
              <span className="text-base">{formData.beds} lit(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <Bath className="h-4 w-4 text-muted-foreground" />
              <span className="text-base">{formData.bathrooms} salle(s) de bain</span>
            </div>
            {formData.square_feet > 0 && (
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-base">{formData.square_feet} m²</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {formData.amenities.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-3">Équipements</p>
            <div className="flex flex-wrap gap-2">
              {displayedAmenities.map((amenity) => (
                <span key={amenity} className="text-base">• {amenity}</span>
              ))}
              {formData.amenities.length > maxVisibleAmenities && (
                <button onClick={() => setShowAllAmenities(!showAllAmenities)} className="text-base underline text-primary ml-2">
                  {showAllAmenities ? "voir moins" : "voir tout"}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3 md:p-6">
          <p className="text-sm text-muted-foreground mb-3">Résumé des tarifs</p>
          <PriceSummaryTable base_price={formData.base_price} cleaning_fee={formData.cleaning_fee} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">Règles et annulation</p>
            <div className="mb-4">
              <p className="text-base mb-2">Règles à respecter lors du séjour :</p>
              <ul className="list-decimal list-inside space-y-1 text-base text-muted-foreground">
                {formData.house_rules && formData.house_rules.split('\n').map((rule, index) => (
                  rule.trim() && <li key={index}>{rule.trim()}</li>
                ))}
                <li>Arrivée à {formData.check_in_time}, départ à {formData.check_out_time}.</li>
              </ul>
            </div>
            <div className="mb-4 text-base text-muted-foreground">
              <p>Séjour minimum : {formData.min_nights} nuit(s)</p>
              {formData.max_nights && <p>Séjour maximum : {formData.max_nights} nuit(s)</p>}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Politique d'annulation</p>
            <p className="text-base">{policyName || "Non spécifiée"}</p>
          </div>
        </CardContent>
      </Card>

      {formData.latitude && formData.longitude && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-3">Localisation</p>
            <div className="w-full h-[300px] rounded-lg overflow-hidden mb-3">
              <LocationMap latitude={formData.latitude} longitude={formData.longitude} />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-base">{formData.address}, {formData.city}, {formData.country}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StepReview;
