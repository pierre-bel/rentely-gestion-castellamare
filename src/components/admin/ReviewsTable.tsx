import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Loader2, MoreVertical, CheckCircle, XCircle, Ban } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Review {
  id: string;
  booking_id: string;
  rating: number;
  status: string;
  created_at: string;
  guest_name: string;
  host_name: string;
  listing_title: string;
  listing_city: string;
  listing_country: string;
}

interface ReviewsTableProps {
  reviews: Review[];
  loading: boolean;
  onRowClick: (review: Review) => void;
  onStatusChange: (reviewId: string, newStatus: "approved" | "rejected" | "blocked") => Promise<void>;
}


export const ReviewsTable = ({ reviews, loading, onRowClick, onStatusChange }: ReviewsTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No reviews found</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="font-semibold">Review ID</TableHead>
            <TableHead className="font-semibold">Booking ID</TableHead>
            <TableHead className="font-semibold">Listing</TableHead>
            <TableHead className="font-semibold">Guest</TableHead>
            <TableHead className="font-semibold">Host</TableHead>
            <TableHead className="font-semibold">Rating</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="w-[50px] font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:nth-child(even)]:bg-[#F8FAFF]">
          {reviews.map((review) => (
            <TableRow
              key={review.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onRowClick(review)}
            >
              <TableCell className="font-medium">
                #{review.id.slice(0, 4).toUpperCase()}
              </TableCell>
              <TableCell>#{review.booking_id.slice(0, 4).toUpperCase()}</TableCell>
              <TableCell>
                <div className="max-w-[200px]">
                  <div className="font-medium truncate">{review.listing_title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {review.listing_city}, {review.listing_country}
                  </div>
                </div>
              </TableCell>
              <TableCell>{review.guest_name}</TableCell>
              <TableCell>{review.host_name}</TableCell>
              <TableCell>
                <span className="font-medium">{review.rating}/5</span>
              </TableCell>
              <TableCell>
                <StatusBadge status={review.status as any} />
              </TableCell>
              <TableCell>{format(new Date(review.created_at), "MMM dd, yyyy")}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {review.status === "pending" && (
                      <>
                        <DropdownMenuItem
                          onClick={() => onStatusChange(review.id, "approved")}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onStatusChange(review.id, "rejected")}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Decline
                        </DropdownMenuItem>
                      </>
                    )}
                    {review.status === "approved" && (
                      <DropdownMenuItem
                        onClick={() => onStatusChange(review.id, "blocked")}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Block
                      </DropdownMenuItem>
                    )}
                    {(review.status === "rejected" || review.status === "blocked") && (
                      <DropdownMenuItem
                        onClick={() => onStatusChange(review.id, "approved")}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
