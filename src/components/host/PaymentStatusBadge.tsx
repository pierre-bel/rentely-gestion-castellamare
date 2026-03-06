import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export interface PaymentItemForStatus {
  is_paid: boolean;
  due_date: string | null;
}

export type PaymentStatusType = "paid" | "partial" | "late" | "unpaid" | "no_schedule";

export function getPaymentStatusFromItems(items: PaymentItemForStatus[]): PaymentStatusType {
  if (items.length === 0) return "no_schedule";
  const today = new Date().toISOString().split("T")[0];
  const paidCount = items.filter(i => i.is_paid).length;
  
  if (paidCount === items.length) return "paid";
  
  // Check if any unpaid item is overdue
  const hasLate = items.some(i => !i.is_paid && i.due_date && i.due_date < today);
  if (hasLate) return "late";
  
  if (paidCount > 0) return "partial";
  
  return "unpaid";
}

const STATUS_CONFIG: Record<PaymentStatusType, { label: string; className: string }> = {
  paid: {
    label: "Payé",
    className: "bg-success/10 text-success-foreground border-success/30 hover:bg-success/10",
  },
  partial: {
    label: "Acompte payé",
    className: "bg-warning/10 text-warning-foreground border-warning/30 hover:bg-warning/10",
  },
  late: {
    label: "En retard",
    className: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/10 animate-pulse",
  },
  unpaid: {
    label: "Non payé",
    className: "bg-muted/50 text-muted-foreground border-muted-foreground/20 hover:bg-muted/50",
  },
  no_schedule: {
    label: "—",
    className: "bg-muted/50 text-muted-foreground border-muted-foreground/20 hover:bg-muted/50",
  },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatusType }) {
  const config = STATUS_CONFIG[status];
  if (status === "no_schedule") return <span className="text-xs text-muted-foreground">—</span>;
  
  return (
    <Badge className={cn("inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium", config.className)}>
      {status === "late" && <AlertTriangle className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
