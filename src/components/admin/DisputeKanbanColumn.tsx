import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AdminDispute } from "./types/disputes";
import { DisputeKanbanCard } from "./DisputeKanbanCard";
import { Badge } from "@/components/ui/badge";

interface DisputeKanbanColumnProps {
  id: string;
  title: string;
  disputes: AdminDispute[];
  onCardClick: (disputeId: string) => void;
  draggedDisputeId?: string | null;
}

const columnConfig: Record<string, { dotColor: string }> = {
  for_review: { dotColor: "bg-pink-500" },
  in_review: { dotColor: "bg-green-700" },
  on_hold: { dotColor: "bg-orange-500" },
  completed: { dotColor: "bg-green-400" },
};

export function DisputeKanbanColumn({ 
  id, 
  title, 
  disputes, 
  onCardClick,
  draggedDisputeId 
}: DisputeKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const config = columnConfig[id] || columnConfig.for_review;

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] md:min-w-[320px] md:w-[320px]">
      <div className="flex items-center justify-between mb-3 md:mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          <h3 className="font-semibold text-sm md:text-base text-foreground">{title}</h3>
        </div>
        <Badge variant="secondary" className="ml-2 text-xs">
          {disputes.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] md:min-h-[500px] rounded-lg p-2 transition-colors ${
          isOver ? "bg-muted/50 border-2 border-dashed border-primary" : "bg-muted/20"
        }`}
      >
        <SortableContext
          items={disputes.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 md:space-y-3">
            {disputes.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-xs md:text-sm">
                No disputes in this stage
              </div>
            ) : (
              disputes.map((dispute) => (
                <DisputeKanbanCard
                  key={dispute.id}
                  dispute={dispute}
                  onClick={() => onCardClick(dispute.id)}
                  isDragging={draggedDisputeId === dispute.id}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
