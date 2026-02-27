import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// All possible status values
export type StatusValue =
  // Booking statuses
  | "confirmed" | "pending_payment" | "completed" 
  | "cancelled" | "cancelled_guest" | "cancelled_host" | "expired"
  // Listing statuses
  | "approved" | "draft" | "pending" | "blocked" | "rejected"
  // Review statuses (pending, approved, rejected, blocked overlap with above)
  // User statuses
  | "active" | "inactive" | "suspended"
  // Transaction/Payout statuses
  | "succeeded" | "processing" | "failed"
  // Transaction types
  | "capture" | "refund"
  // Dispute statuses
  | "open" | "in_progress" | "on_hold" | "resolved" | "resolved_approved" | "resolved_declined" | "closed" | "escalated" | "pending";

export type StatusVariant = "success" | "primary" | "warning" | "destructive" | "muted" | "outline";

interface StatusBadgeProps {
  status: StatusValue;
  className?: string;
}

const STATUS_CONFIG: Record<StatusValue, { variant: StatusVariant; label?: string }> = {
  // Success states
  approved: { variant: "success" },
  completed: { variant: "success" },
  active: { variant: "success" },
  succeeded: { variant: "success" },
  resolved: { variant: "success" },
  resolved_approved: { variant: "success", label: "Approved" },
  
  // Primary/Info states
  confirmed: { variant: "primary" },
  processing: { variant: "primary" },
  in_progress: { variant: "primary", label: "In Review" },
  on_hold: { variant: "primary", label: "On Hold" },
  
  // Warning states
  pending: { variant: "warning" },
  pending_payment: { variant: "warning", label: "Pending Payment" },
  inactive: { variant: "warning" },
  open: { variant: "warning", label: "For Review" },
  escalated: { variant: "warning" },
  
  // Destructive states
  cancelled: { variant: "destructive" },
  cancelled_guest: { variant: "destructive", label: "Cancelled" },
  cancelled_host: { variant: "destructive", label: "Cancelled" },
  expired: { variant: "destructive" },
  failed: { variant: "destructive" },
  rejected: { variant: "destructive" },
  resolved_declined: { variant: "destructive", label: "Declined" },
  blocked: { variant: "destructive" },
  suspended: { variant: "destructive" },
  
  // Neutral states
  draft: { variant: "muted" },
  closed: { variant: "muted" },
  
  // Types (for transactions)
  capture: { variant: "outline" },
  refund: { variant: "outline" },
};

const VARIANT_STYLES: Record<StatusVariant, string> = {
  success: "bg-success/10 text-success-foreground border-success/30 hover:bg-success/10 hover:text-success-foreground hover:border-success/30",
  primary: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/30",
  warning: "bg-warning/10 text-warning-foreground border-warning/30 hover:bg-warning/10 hover:text-warning-foreground hover:border-warning/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30",
  muted: "bg-muted/50 text-muted-foreground border-muted-foreground/20 hover:bg-muted/50 hover:text-muted-foreground hover:border-muted-foreground/20",
  outline: "bg-transparent text-foreground border-border hover:bg-transparent hover:text-foreground hover:border-border",
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = STATUS_CONFIG[status];
  
  // Fallback for unknown statuses
  if (!config) {
    console.warn(`Unknown status value: ${status}`);
    return (
      <Badge 
        className={cn(
          "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium",
          VARIANT_STYLES.muted,
          className
        )}
      >
        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
      </Badge>
    );
  }
  
  const label = config.label || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  
  return (
    <Badge 
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium",
        VARIANT_STYLES[config.variant],
        className
      )}
    >
      {label}
    </Badge>
  );
};
