import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { GuestDebt } from "./types/financial";

interface GuestDebtsTableProps {
  guestDebts: GuestDebt[];
  loading: boolean;
}

const GuestDebtsTable = ({ guestDebts, loading }: GuestDebtsTableProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "outstanding":
        return "destructive";
      case "paid":
        return "default";
      case "waived":
        return "secondary";
      case "expired":
        return "outline";
      default:
        return "default";
    }
  };

  const getReasonLabel = (reason: string) => {
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (guestDebts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No guest debts found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="font-semibold">Guest</TableHead>
            <TableHead className="font-semibold">Dispute</TableHead>
            <TableHead className="font-semibold">Listing</TableHead>
            <TableHead className="font-semibold">Amount</TableHead>
            <TableHead className="font-semibold">Reason</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Created</TableHead>
            <TableHead className="font-semibold">Expires</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:nth-child(even)]:bg-[#F8FAFF]">
          {guestDebts.map((debt) => (
            <TableRow key={debt.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={debt.guest_avatar} />
                    <AvatarFallback>
                      {debt.guest_name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{debt.guest_name}</div>
                    <div className="text-xs text-muted-foreground">{debt.guest_email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-mono text-xs">
                  {debt.dispute_display_id}
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[200px] truncate" title={debt.listing_title}>
                  {debt.listing_title}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-semibold">
                  ${debt.amount.toFixed(2)} {debt.currency}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {getReasonLabel(debt.reason)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(debt.status)}>
                  {debt.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(new Date(debt.created_at), "MMM d, yyyy")}
                </div>
              </TableCell>
              <TableCell>
                {debt.expires_at ? (
                  <div className="text-sm">
                    {format(new Date(debt.expires_at), "MMM d, yyyy")}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default GuestDebtsTable;
