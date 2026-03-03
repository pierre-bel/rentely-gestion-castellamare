import { ListingFormData } from "@/pages/host/CreateListing";
import FormInput from "./FormInput";
import FormSelect from "./FormSelect";
import FormTextarea from "./FormTextarea";

interface StepPropertyTypeProps {
  formData: ListingFormData;
  updateFormData: (data: Partial<ListingFormData>) => void;
}

const PROPERTY_TYPES = [
  { value: "apartment", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "room", label: "Chambre" },
  { value: "house", label: "Maison" },
];

const GUEST_OPTIONS = Array.from({ length: 16 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const BEDROOM_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const BED_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const BATHROOM_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const StepPropertyType = ({ formData, updateFormData }: StepPropertyTypeProps) => {
  return (
    <div className="space-y-6">
      <p className="text-base text-foreground">Définissez les caractéristiques de votre bien.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Type de bien"
          value={formData.type}
          onChange={(value) => updateFormData({ type: value })}
          options={PROPERTY_TYPES}
          required
        />
        <FormInput
          label="Titre de l'annonce"
          placeholder="Bel appartement 2 pièces lumineux"
          value={formData.title}
          onChange={(value) => updateFormData({ title: value })}
          required
        />
      </div>

      <FormTextarea
        label="Description courte"
        placeholder="Appartement spacieux et moderne, proche du centre-ville."
        value={formData.description}
        onChange={(value) => updateFormData({ description: value })}
        rows={4}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Voyageurs max"
          value={String(formData.guests_max)}
          onChange={(value) => updateFormData({ guests_max: parseInt(value) })}
          options={GUEST_OPTIONS}
          required
        />
        <FormSelect
          label="Chambres"
          value={String(formData.bedrooms)}
          onChange={(value) => updateFormData({ bedrooms: parseInt(value) })}
          options={BEDROOM_OPTIONS}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Lits"
          value={String(formData.beds)}
          onChange={(value) => updateFormData({ beds: parseInt(value) })}
          options={BED_OPTIONS}
          required
        />
        <FormSelect
          label="Salles de bain"
          value={String(formData.bathrooms)}
          onChange={(value) => updateFormData({ bathrooms: parseInt(value) })}
          options={BATHROOM_OPTIONS}
          required
        />
      </div>

      <FormInput
        label="Surface (m²)"
        placeholder="85"
        value={formData.square_feet ? String(formData.square_feet) : ""}
        onChange={(value) => updateFormData({ square_feet: value ? parseInt(value) : 0 })}
        type="number"
      />
    </div>
  );
};

export default StepPropertyType;
