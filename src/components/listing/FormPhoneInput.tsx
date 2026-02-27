import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useState } from "react";

interface FormPhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const FormPhoneInput = ({ label, value, onChange, required = false }: FormPhoneInputProps) => {
  const [error, setError] = useState<string>("");

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters except +
    const cleaned = input.replace(/[^\d+]/g, '');
    return cleaned;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
    if (error) setError("");
  };

  const handleBlur = () => {
    // Validate on blur
    if (value && value.length > 0) {
      try {
        if (!isValidPhoneNumber(value)) {
          console.log("Invalid phone number format");
        }
      } catch (err) {
        console.log("Error validating phone number");
      }
    }
  };

  return (
    <div className="relative">
      <Input
        type="tel"
        placeholder=" "
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        required={required}
        className="peer h-14 rounded-full px-6 border-[#D5DAE7] bg-white text-base placeholder-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:border-primary"
      />
      <label
        className={cn(
          "absolute left-6 top-1/2 -translate-y-1/2 text-base text-muted-foreground",
          "transition-all duration-200 pointer-events-none",
          "peer-focus:top-0 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2"
        )}
      >
        {label}
      </label>
    </div>
  );
};

export default FormPhoneInput;
