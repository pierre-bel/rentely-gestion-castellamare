import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ListingFormData } from "@/pages/host/CreateListing";

interface StepDetailsProps {
  formData: ListingFormData;
  updateFormData: (data: Partial<ListingFormData>) => void;
}

const AMENITIES = [
  "WiFi",
  "Cuisine",
  "Lave-linge",
  "Sèche-linge",
  "Climatisation",
  "Chauffage",
  "TV",
  "Piscine",
  "Salle de sport",
  "Parking",
  "Ascenseur",
  "Animaux acceptés",
];

const StepDetails = ({ formData, updateFormData }: StepDetailsProps) => {
  const toggleAmenity = (amenity: string) => {
    const newAmenities = formData.amenities.includes(amenity)
      ? formData.amenities.filter((a) => a !== amenity)
      : [...formData.amenities, amenity];
    updateFormData({ amenities: newAmenities });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-3 block">Équipements</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {AMENITIES.map((amenity) => (
            <div key={amenity} className="flex items-center space-x-2">
              <Checkbox
                id={amenity}
                checked={formData.amenities.includes(amenity)}
                onCheckedChange={() => toggleAmenity(amenity)}
              />
              <label
                htmlFor={amenity}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {amenity}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StepDetails;
