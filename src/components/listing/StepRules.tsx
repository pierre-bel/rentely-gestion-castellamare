import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FormInput from "./FormInput";
import FormSelect from "./FormSelect";
import FormTextarea from "./FormTextarea";
import { ListingFormData } from "@/pages/host/CreateListing";
import { format24to12Hour, format12to24Hour } from "@/lib/exportUtils";

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
      }
      setLoadingPolicies(false);
    };

    fetchPolicies();
  }, []);
  // Generate options for minimum nights (1-30)
  const minNightsOptions = Array.from({ length: 30 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  // Generate options for maximum nights (1-365)
  const maxNightsOptions = Array.from({ length: 365 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const cancellationOptions = policies.map(policy => ({
    value: policy.id,
    label: policy.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-base text-foreground mb-6">Define guest conduct and limits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Check-in From"
          type="text"
          value={format24to12Hour(formData.check_in_time)}
          onChange={(value) => updateFormData({ check_in_time: format12to24Hour(value) })}
          placeholder="2:00 PM"
          pattern="[0-9]{1,2}:[0-9]{2}\s*(AM|PM|am|pm)"
          maxLength={8}
          title="Format: HH:MM AM/PM"
          required
        />
        <FormInput
          label="Check-out Until"
          type="text"
          value={format24to12Hour(formData.check_out_time)}
          onChange={(value) => updateFormData({ check_out_time: format12to24Hour(value) })}
          placeholder="11:00 AM"
          pattern="[0-9]{1,2}:[0-9]{2}\s*(AM|PM|am|pm)"
          maxLength={8}
          title="Format: HH:MM AM/PM"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Minimum Nights"
          value={String(formData.min_nights)}
          onChange={(value) => updateFormData({ min_nights: parseInt(value) })}
          options={minNightsOptions}
          required
        />
        <FormSelect
          label="Maximum Nights"
          value={String(formData.max_nights)}
          onChange={(value) => updateFormData({ max_nights: parseInt(value) })}
          options={maxNightsOptions}
          required
        />
      </div>

      <FormTextarea
        label="House Rules"
        placeholder="No smoking. Quiet hours after 11:00pm"
        value={formData.house_rules}
        onChange={(value) => updateFormData({ house_rules: value })}
        rows={5}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Cancellation Policy"
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
            $
          </span>
          <label className="absolute left-10 top-1/2 -translate-y-1/2 text-base text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-0 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
            Cleaning Fee
          </label>
        </div>
      </div>
    </div>
  );
};

export default StepRules;
