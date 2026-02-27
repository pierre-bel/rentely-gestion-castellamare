import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { AdminDispute } from "./types/disputes";
import { StatusBadge } from "@/components/ui/status-badge";
import { GripVertical } from "lucide-react";

interface DisputeKanbanCardProps {
  dispute: AdminDispute;
  onClick: () => void;
  isDragging?: boolean;
}

const getCategoryLabel = (category: string): string => {
  const labelMap: Record<string, string> = {
    refund_request: "Refund",
    policy_violation: "Policy Violation",
    property_damage: "Damage",
    cleanliness_issue: "Cleanliness",
    amenity_issue: "Amenity",
    safety_concern: "Safety",
    billing_dispute: "Billing",
    other: "Other",
  };
  return labelMap[category] || "Other";
};

export function DisputeKanbanCard({ dispute, onClick, isDragging }: DisputeKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: dispute.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCompleted = dispute.status === "resolved_approved" || dispute.status === "resolved_declined";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[#F8FAFF] border border-[#D5DAE7] rounded-lg p-3 md:p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <span className="inline-flex items-center rounded-md border border-muted-foreground/20 bg-muted/50 px-2 py-0.5 text-[10px] md:text-xs font-medium text-foreground">
          {getCategoryLabel(dispute.category)}
        </span>
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-[10px] md:text-xs text-muted-foreground">
            {format(new Date(dispute.created_at), "MMM dd, yy")}
          </span>
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-3 w-3 md:h-4 md:w-4" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Booking:</span>
          <span className="font-medium text-[11px] md:text-sm">{dispute.booking_display_id}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Amount:</span>
          <span className="font-semibold">
            {dispute.requested_refund_amount 
              ? `$${dispute.requested_refund_amount.toFixed(2)}` 
              : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Location:</span>
          <span className="font-medium truncate ml-2">
            {dispute.listing_city}, {dispute.listing_country}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Host:</span>
          <span className="font-medium truncate ml-2">{dispute.host_name}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Guest:</span>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="font-medium truncate">{dispute.guest_name}</span>
            <StatusBadge status={dispute.status as any} />
          </div>
        </div>
      </div>

      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-[#D5DAE7]">
        <div className="text-[10px] md:text-xs text-muted-foreground mb-1">Reason:</div>
        <div className="bg-white rounded p-1.5 md:p-2 text-[10px] md:text-xs line-clamp-3">
          {dispute.description}
        </div>
      </div>

      {isCompleted && dispute.resolution_notes && (
        <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-[#D5DAE7]">
          <div className="text-[10px] md:text-xs text-muted-foreground mb-1">Resolution:</div>
          <div className="bg-white rounded p-1.5 md:p-2 text-[10px] md:text-xs line-clamp-2">
            {dispute.resolution_notes}
          </div>
        </div>
      )}
    </div>
  );
}
