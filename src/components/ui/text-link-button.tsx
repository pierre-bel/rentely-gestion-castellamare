import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextLinkButtonProps {
  href: string;
  children: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

export const TextLinkButton = ({ 
  href, 
  children, 
  showIcon = true,
  className 
}: TextLinkButtonProps) => {
  return (
    <Link
      to={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground",
        "hover:text-foreground hover:underline transition-colors",
        "p-0",
        className
      )}
    >
      {children}
      {showIcon && <ArrowRight className="h-4 w-4" />}
    </Link>
  );
};
