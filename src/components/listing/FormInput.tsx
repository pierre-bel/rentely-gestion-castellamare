import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  pattern?: string;
  maxLength?: number;
  title?: string;
}

const FormInput = ({ label, placeholder = "", value, onChange, type = "text", required = false, pattern, maxLength, title }: FormInputProps) => {
  return (
    <div className="relative">
      <Input
        type={type}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        pattern={pattern}
        maxLength={maxLength}
        title={title}
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

export default FormInput;
