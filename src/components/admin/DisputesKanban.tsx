import { useState, useMemo, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { AdminDispute } from "./types/disputes";
import { DisputeKanbanColumn } from "./DisputeKanbanColumn";
import { DisputeKanbanCard } from "./DisputeKanbanCard";
import { DisputeResolutionDialog } from "./DisputeResolutionDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDemoData } from "@/hooks/useDemoData";
import { Skeleton } from "@/components/ui/skeleton";

interface DisputesKanbanProps {
  disputes: AdminDispute[];
  loading: boolean;
}

const getColumnForStatus = (status: string): string => {
  switch (status) {
    case "open":
    case "pending":
      return "for_review";
    case "in_progress":
      return "in_review";
    case "on_hold":
      return "on_hold";
    case "resolved_approved":
    case "resolved_declined":
      return "completed";
    default:
      return "for_review";
  }
};

const getStatusForColumn = (column: string): string => {
  switch (column) {
    case "for_review":
      return "open";
    case "in_review":
      return "in_progress";
    case "on_hold":
      return "on_hold";
    default:
      return "open";
  }
};

export default function DisputesKanban({ disputes: fetchedDisputes, loading }: DisputesKanbanProps) {
  const { isDemoMode, updateAdminDisputeStatus } = useDemoData();
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [draggedDispute, setDraggedDispute] = useState<AdminDispute | null>(null);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (fetchedDisputes) {
      setDisputes(fetchedDisputes);
    }
  }, [fetchedDisputes]);

  const groupedDisputes = useMemo(() => {
    return {
      for_review: disputes.filter((d) => ["open", "pending"].includes(d.status)),
      in_review: disputes.filter((d) => d.status === "in_progress"),
      on_hold: disputes.filter((d) => d.status === "on_hold"),
      completed: disputes.filter((d) => ["resolved_approved", "resolved_declined"].includes(d.status)),
    };
  }, [disputes]);

  const handleDragStart = (event: DragStartEvent) => {
    const dispute = disputes.find((d) => d.id === event.active.id);
    setDraggedDispute(dispute || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedDispute(null);

    if (!over || active.id === over.id) return;

    const disputeId = active.id as string;
    
    const dispute = disputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const currentColumn = getColumnForStatus(dispute.status);
    
    // Determine target column: over.id could be a column ID or a card ID
    let targetColumn: string;
    const columnIds = ["for_review", "in_review", "on_hold", "completed"];
    
    if (columnIds.includes(over.id as string)) {
      // Dropped over a column
      targetColumn = over.id as string;
    } else {
      // Dropped over another card - find which column that card belongs to
      const targetDispute = disputes.find((d) => d.id === over.id);
      if (!targetDispute) return;
      targetColumn = getColumnForStatus(targetDispute.status);
    }
    
    // Allow reordering within the same column (visual only, no persistence)
    if (currentColumn === targetColumn) {
      // Just visual reordering - no backend update needed
      return;
    }

    // Prevent moving from completed to other columns
    if (currentColumn === "completed") {
      toast({
        title: "Cannot Move",
        description: "Resolved disputes cannot be moved to other columns",
        variant: "destructive",
      });
      return;
    }

    // Special case: Moving to Completed
    if (targetColumn === "completed") {
      setSelectedDisputeId(disputeId);
      return;
    }

    const newStatus = getStatusForColumn(targetColumn);

    if (isDemoMode) {
      // DEMO MODE: Update localStorage
      const success = updateAdminDisputeStatus(disputeId, newStatus);
      if (success) {
        // Optimistic update
        setDisputes((prev) =>
          prev.map((d) =>
            d.id === disputeId
              ? { ...d, status: newStatus, updated_at: new Date().toISOString() }
              : d
          )
        );
        toast({
          title: "Status Updated",
          description: `Dispute moved to ${targetColumn.replace("_", " ")}`,
        });
        queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      } else {
        toast({
          title: "Error",
          description: "Failed to update dispute status",
          variant: "destructive",
        });
      }
    } else {
      // REAL MODE: Update Supabase
      // Optimistic update
      const updatedDispute = { ...dispute, status: newStatus };
      setDisputes((prev) =>
        prev.map((d) => (d.id === disputeId ? updatedDispute : d))
      );

      try {
        const { error } = await supabase
          .from("disputes")
          .update({
            status: newStatus as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", disputeId)
          .eq("updated_at", dispute.updated_at);

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });

        toast({
          title: "Status Updated",
          description: `Dispute moved to ${targetColumn.replace("_", " ")}`,
        });
      } catch (error: any) {
        // Revert optimistic update
        setDisputes((prev) =>
          prev.map((d) => (d.id === disputeId ? dispute : d))
        );

        if (error?.code === "PGRST116") {
          toast({
            title: "Conflict",
            description: "This dispute was modified by another admin. Refreshing...",
            variant: "destructive",
          });
          queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
        } else {
          toast({
            title: "Error",
            description: "Failed to update dispute status",
            variant: "destructive",
          });
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col min-w-[280px] w-[280px] md:min-w-[320px] md:w-[320px]">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="min-h-[500px] rounded-lg bg-muted/20 p-2">
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="bg-[#F8FAFF] border border-[#D5DAE7] rounded-lg p-3 md:p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#D5DAE7]">
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 md:gap-4 overflow-x-auto pb-4">
          <DisputeKanbanColumn
            id="for_review"
            title="For Review"
            disputes={groupedDisputes.for_review}
            onCardClick={setSelectedDisputeId}
            draggedDisputeId={draggedDispute?.id}
          />
          <DisputeKanbanColumn
            id="in_review"
            title="In Review"
            disputes={groupedDisputes.in_review}
            onCardClick={setSelectedDisputeId}
            draggedDisputeId={draggedDispute?.id}
          />
          <DisputeKanbanColumn
            id="on_hold"
            title="On Hold"
            disputes={groupedDisputes.on_hold}
            onCardClick={setSelectedDisputeId}
            draggedDisputeId={draggedDispute?.id}
          />
          <DisputeKanbanColumn
            id="completed"
            title="Completed"
            disputes={groupedDisputes.completed}
            onCardClick={setSelectedDisputeId}
            draggedDisputeId={draggedDispute?.id}
          />
        </div>

        <DragOverlay>
          {draggedDispute && (
            <DisputeKanbanCard
              dispute={draggedDispute}
              onClick={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      <DisputeResolutionDialog
        open={!!selectedDisputeId}
        onOpenChange={(open) => !open && setSelectedDisputeId(null)}
        disputeId={selectedDisputeId}
      />
    </>
  );
}
