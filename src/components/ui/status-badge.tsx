import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// All possible status values
export type StatusValue =
  // Booking statuses
  | "confirmed" | "pending_payment" | "completed" 
  | "cancelled" | "cancelled_guest" | "cancelled_host" | "expired"
  | "owner_blocked" | "pre_reservation"
  // Listing statuses
  | "approved" | "draft" | "pending" | "blocked" | "rejected"
  // User statuses
  | "active" | "inactive" | "suspended"
  // Transaction/Payout statuses
  | "succeeded" | "processing" | "failed"
  // Transaction types
  | "capture" | "refund"
  // Dispute statuses
  | "open" | "in_progress" | "on_hold" | "resolved" | "resolved_approved" | "resolved_declined" | "closed" | "escalated" | "pending";

export type StatusVariant = "success" | "primary" | "warning" | "destructive" | "muted" | "outline" | "purple" | "orange";

interface StatusBadgeProps {
  status: StatusValue;
  className?: string;
}

const STATUS_CONFIG: Record<StatusValue, { variant: StatusVariant; label: string }> = {
  // Success states
  approved: { variant: "success", label: "Approuvée" },
  completed: { variant: "success", label: "Terminée" },
  active: { variant: "success", label: "Actif" },
  succeeded: { variant: "success", label: "Réussi" },
  resolved: { variant: "success", label: "Résolu" },
  resolved_approved: { variant: "success", label: "Approuvé" },
  
  // Primary/Info states
  confirmed: { variant: "primary", label: "Confirmée" },
  processing: { variant: "primary", label: "En cours" },
  in_progress: { variant: "primary", label: "En examen" },
  on_hold: { variant: "primary", label: "En attente" },
  
  // Warning states
  pending: { variant: "warning", label: "En attente" },
  pending_payment: { variant: "warning", label: "Paiement en attente" },
  inactive: { variant: "warning", label: "Inactif" },
  open: { variant: "warning", label: "À examiner" },
  escalated: { variant: "warning", label: "Escaladé" },
  
  // Destructive states
  cancelled: { variant: "destructive", label: "Annulée" },
  cancelled_guest: { variant: "destructive", label: "Annulée (locataire)" },
  cancelled_host: { variant: "destructive", label: "Annulée (hôte)" },
  expired: { variant: "destructive", label: "Expirée" },
  failed: { variant: "destructive", label: "Échoué" },
  rejected: { variant: "destructive", label: "Rejetée" },
  resolved_declined: { variant: "destructive", label: "Refusé" },
  blocked: { variant: "destructive", label: "Bloquée" },
  suspended: { variant: "destructive", label: "Suspendu" },
  
  // Neutral states
  draft: { variant: "muted", label: "Brouillon" },
  closed: { variant: "muted", label: "Fermé" },
  
  // Special booking states
  owner_blocked: { variant: "purple", label: "Bloqué (perso)" },
  pre_reservation: { variant: "orange", label: "Pré-réservation" },
  
  // Types (for transactions)
  capture: { variant: "outline", label: "Encaissement" },
  refund: { variant: "outline", label: "Remboursement" },
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
  
  return (
    <Badge 
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium",
        VARIANT_STYLES[config.variant],
        className
      )}
    >
      {config.label}
    </Badge>
  );
};
