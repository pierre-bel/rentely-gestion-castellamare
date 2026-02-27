import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AdminDispute } from "./types/disputes";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DisputeResolutionDialog } from "./DisputeResolutionDialog";

interface DisputesTableProps {
  disputes: AdminDispute[];
  loading: boolean;
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

export default function DisputesTable({ disputes, loading }: DisputesTableProps) {
  const navigate = useNavigate();
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  if (loading) {
    return (
      <div className="rounded-xl border overflow-hidden">
        <Table noScroll>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Dispute ID</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold hidden 2xl:table-cell">Guest</TableHead>
              <TableHead className="font-semibold hidden 2xl:table-cell">Host</TableHead>
              <TableHead className="font-semibold hidden 3xl:table-cell">Reason</TableHead>
              <TableHead className="font-semibold hidden 3xl:table-cell">Created</TableHead>
              <TableHead className="font-semibold hidden 3xl:table-cell">Updated</TableHead>
              <TableHead className="font-semibold text-right">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold px-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className={i % 2 === 0 ? "bg-[#F8FAFF]" : ""}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="hidden 3xl:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell className="hidden 3xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="hidden 3xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell className="px-6">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (disputes.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground text-lg">No disputes found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden xl:block rounded-xl border overflow-hidden">
        <Table noScroll>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Dispute ID</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold hidden 2xl:table-cell">Guest</TableHead>
              <TableHead className="font-semibold hidden 2xl:table-cell">Host</TableHead>
              <TableHead className="font-semibold hidden 3xl:table-cell">Reason</TableHead>
              <TableHead className="font-semibold hidden 3xl:table-cell">Created</TableHead>
              <TableHead className="font-semibold hidden 3xl:table-cell">Updated</TableHead>
              <TableHead className="font-semibold text-right">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold px-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disputes.map((dispute, index) => (
              <TableRow key={dispute.id} className={index % 2 === 0 ? "bg-[#F8FAFF] hover:bg-muted/50" : "hover:bg-muted/50"}>
                <TableCell>
                  <span className="text-sm font-medium">{dispute.dispute_display_id}</span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md border border-muted-foreground/20 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {getCategoryLabel(dispute.category)}
                  </span>
                </TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  <span className="text-sm font-medium">{dispute.guest_name}</span>
                </TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  <span className="text-sm font-medium">{dispute.host_name}</span>
                </TableCell>
                <TableCell className="hidden 3xl:table-cell max-w-[360px]">
                  <span className="text-sm line-clamp-2" title={dispute.description}>
                    {dispute.description}
                  </span>
                </TableCell>
                <TableCell className="hidden 3xl:table-cell">
                  <span className="text-sm whitespace-nowrap">
                    {format(new Date(dispute.created_at), "MMM dd, yyyy")}
                  </span>
                </TableCell>
                <TableCell className="hidden 3xl:table-cell">
                  <span className="text-sm whitespace-nowrap">
                    {format(new Date(dispute.updated_at), "MMM dd, yyyy")}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {dispute.requested_refund_amount ? (
                    <span className="font-semibold">${dispute.requested_refund_amount.toFixed(2)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={dispute.status as any} />
                </TableCell>
                <TableCell className="px-6">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-9 w-9"
                      onClick={() => setSelectedDisputeId(dispute.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-9 w-9"
                      onClick={() => dispute.support_thread_id && navigate(`/admin/support?thread=${dispute.support_thread_id}`)}
                      disabled={!dispute.support_thread_id}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="xl:hidden space-y-4">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="text-sm mb-1 line-clamp-2">{dispute.description}</div>
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-md border border-muted-foreground/20 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {getCategoryLabel(dispute.category)}
                  </span>
                </div>
              </div>
              <StatusBadge status={dispute.status as any} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Guest</div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{dispute.guest_name}</span>
                  <span className="text-xs text-muted-foreground">{dispute.guest_email}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Host</div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{dispute.host_name}</span>
                  <span className="text-xs text-muted-foreground">{dispute.host_email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Created</div>
                <div>{format(new Date(dispute.created_at), "MMM dd, yyyy")}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Updated</div>
                <div>{format(new Date(dispute.updated_at), "MMM dd, yyyy")}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Amount</div>
                <div className="font-semibold">
                  {dispute.requested_refund_amount ? `$${dispute.requested_refund_amount.toFixed(2)}` : "—"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => setSelectedDisputeId(dispute.id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => dispute.support_thread_id && navigate(`/admin/support?thread=${dispute.support_thread_id}`)}
                disabled={!dispute.support_thread_id}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
            </div>
          </div>
        ))}
      </div>

      <DisputeResolutionDialog
        open={!!selectedDisputeId}
        onOpenChange={(open) => !open && setSelectedDisputeId(null)}
        disputeId={selectedDisputeId}
      />
    </>
  );
}
