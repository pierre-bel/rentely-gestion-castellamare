import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FormInput from "./FormInput";
import FormSelect from "./FormSelect";
import FormTextarea from "./FormTextarea";
import { ListingFormData } from "@/pages/host/CreateListing";

interface StepRulesProps {
  formData: ListingFormData;
  updateFormData: (data: Partial<ListingFormData>) => void;
}

interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
}

const StepRules = ({ formData, updateFormData }: StepRulesProps) => {
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  useEffect(() => {
    const fetchPolicies = async () => {
      const { data, error } = await supabase
        .from('cancellation_policies')
        .select('id, name, description')
        .eq('is_active', true)
        .order('days_before_checkin', { ascending: true });
      
      if (data && !error) {
        setPolicies(data);
        // Auto-select first policy if none selected
        if (!formData.cancellation_policy_id && data.length > 0) {
          updateFormData({ cancellation_policy_id: data[0].id });
        }
      }
      setLoadingPolicies(false);
    };

    fetchPolicies();
  }, []);

  const minNightsOptions = Array.from({ length: 30 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} nuit${i > 0 ? 's' : ''}`,
  }));

  const maxNightsOptions = Array.from({ length: 365 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} nuit${i > 0 ? 's' : ''}`,
  }));

  const cancellationOptions = policies.map(policy => ({
    value: policy.id,
    label: policy.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-base text-foreground mb-6">Définissez les règles et conditions de séjour.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Arrivée à partir de"
          type="time"
          value={formData.check_in_time}
          onChange={(value) => updateFormData({ check_in_time: value })}
          required
        />
        <FormInput
          label="Départ avant"
          type="time"
          value={formData.check_out_time}
          onChange={(value) => updateFormData({ check_out_time: value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Séjour minimum"
          value={String(formData.min_nights)}
          onChange={(value) => updateFormData({ min_nights: parseInt(value) })}
          options={minNightsOptions}
          required
        />
        <FormSelect
          label="Séjour maximum"
          value={String(formData.max_nights)}
          onChange={(value) => updateFormData({ max_nights: parseInt(value) })}
          options={maxNightsOptions}
          required
        />
      </div>

      <FormTextarea
        label="Règlement intérieur"
        placeholder="Non-fumeur. Calme après 22h00."
        value={formData.house_rules}
        onChange={(value) => updateFormData({ house_rules: value })}
        rows={5}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Politique d'annulation"
          value={formData.cancellation_policy_id || ""}
          onChange={(value) => updateFormData({ cancellation_policy_id: value })}
          options={cancellationOptions}
          required
        />
        <div className="relative">
          <Input
            type="number"
            placeholder=" "
            value={formData.cleaning_fee ?? ""}
            onChange={(e) => updateFormData({ cleaning_fee: e.target.value ? parseFloat(e.target.value) : null })}
            min="0"
            step="0.01"
            className="peer h-14 rounded-full pl-10 pr-6 border-[#D5DAE7] bg-white text-base placeholder-transparent focus:outline-none focus-visible:ring-0 focus:ring-0 focus:ring-offset-0 focus:border-primary"
          />
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-base text-foreground pointer-events-none z-10">
            €
          </span>
          <label className="absolute left-10 top-1/2 -translate-y-1/2 text-base text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-0 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
            Frais de ménage
          </label>
        </div>
      </div>
    </div>
  );
};

export default StepRules;
