import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, StatusValue } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Transaction } from "./types/financial";

interface TransactionsTableProps {
  transactions: Transaction[];
  loading: boolean;
}

const TransactionsTable = ({ transactions, loading }: TransactionsTableProps) => {
  const truncateId = (id: string) => {
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  };

  const mapTransactionStatus = (status: string): StatusValue => {
    switch (status) {
      case "succeeded": return "succeeded";
      case "processing": return "processing";
      case "failed": return "failed";
      case "pending": return "pending";
      default: return "pending";
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; className: string }> = {
      payment: { label: "Payment", className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700" },
      refund: { label: "Refund", className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 hover:text-orange-700" },
      capture: { label: "Debt Payment", className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-700" },
    };

    const config = typeConfig[type] || { label: type, className: "" };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No transactions found</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Transaction ID</TableHead>
              <TableHead className="font-semibold">Booking ID</TableHead>
              <TableHead className="font-semibold">Transaction Type</TableHead>
              <TableHead className="font-semibold">User</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:nth-child(even)]:bg-[#F8FAFF]">
            {transactions.map((transaction) => (
              <TableRow key={transaction.id} className="hover:bg-muted/50">
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-mono text-xs cursor-help">
                        {truncateId(transaction.id)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs">{transaction.id}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-mono text-xs cursor-help">
                        {truncateId(transaction.booking_id)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs">{transaction.booking_id}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {getTransactionTypeBadge(transaction.type)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={transaction.guest_avatar} />
                      <AvatarFallback>
                        {transaction.guest_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{transaction.guest_name}</span>
                      <span className="text-xs text-muted-foreground">{transaction.guest_email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">
                    {transaction.currency} {Number(transaction.amount).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(transaction.created_at), "MMM dd, yyyy")}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={mapTransactionStatus(transaction.status)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default TransactionsTable;
