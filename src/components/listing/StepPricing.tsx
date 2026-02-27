import { Input } from "@/components/ui/input";
import FormInput from "./FormInput";
import { ListingFormData } from "@/pages/host/CreateListing";

interface StepPricingProps {
  formData: ListingFormData;
  updateFormData: (data: Partial<ListingFormData>) => void;
}

const StepPricing = ({ formData, updateFormData }: StepPricingProps) => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-base text-foreground mb-6">Configure base and dynamic pricing.</p>
      </div>

      <div className="relative">
        <Input
          type="number"
          placeholder=" "
          value={formData.base_price || ""}
          onChange={(e) => updateFormData({ base_price: e.target.value ? parseFloat(e.target.value) : 0 })}
          min="1"
          step="0.01"
          required
          className="peer h-14 rounded-full pl-10 pr-6 border-[#D5DAE7] bg-white text-base placeholder-transparent focus:outline-none focus-visible:ring-0 focus:ring-0 focus:ring-offset-0 focus:border-primary"
        />
        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-base text-foreground pointer-events-none z-10">
          $
        </span>
        <label className="absolute left-10 top-1/2 -translate-y-1/2 text-base text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-0 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
          Base Price per Night *
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Weekly Discount (%)"
          type="number"
          value={formData.weekly_discount && formData.weekly_discount > 0 ? formData.weekly_discount.toString() : ""}
          onChange={(value) => updateFormData({ weekly_discount: value ? parseFloat(value) : 0 })}
          placeholder="0"
        />
        <FormInput
          label="Monthly Discount (%)"
          type="number"
          value={formData.monthly_discount && formData.monthly_discount > 0 ? formData.monthly_discount.toString() : ""}
          onChange={(value) => updateFormData({ monthly_discount: value ? parseFloat(value) : 0 })}
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Platform Fee</p>
          <p className="text-base font-medium text-foreground">Auto-calculated</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Estimated Host Payout</p>
          <p className="text-base font-medium text-foreground">Auto-calculated after fee</p>
        </div>
      </div>
    </div>
  );
};

export default StepPricing;
