import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FormTextareaProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
}

const FormTextarea = ({ 
  label, 
  placeholder = "", 
  value, 
  onChange, 
  required = false,
  rows = 4 
}: FormTextareaProps) => {
  return (
    <div className="relative">
      <Textarea
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        rows={rows}
        className="peer rounded-3xl px-6 py-4 border-[#D5DAE7] bg-white text-base placeholder-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:border-primary resize-none"
      />
      <label
        className={cn(
          "absolute left-6 top-4 text-base text-muted-foreground",
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

export default FormTextarea;
