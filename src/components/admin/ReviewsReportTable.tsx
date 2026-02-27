import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Star } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ListingReviewsReport } from "./types/reviews-report";

interface ReviewsReportTableProps {
  data: ListingReviewsReport[];
  loading: boolean;
}

export default function ReviewsReportTable({ data, loading }: ReviewsReportTableProps) {
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleExportListing = async (listing: ListingReviewsReport) => {
    setExportingId(listing.listing_id);
    
    try {
      const { data: reviewsData, error } = await supabase.rpc(
        "admin_get_listing_reviews_detail",
        { p_listing_id: listing.listing_id }
      );

      if (error) throw error;

      if (!reviewsData || reviewsData.length === 0) {
        toast.error("No reviews found for this listing");
        return;
      }

      // Generate CSV
      const headers = [
        "Listing ID",
        "Listing Name",
        "City",
        "User Name",
        "Review Text",
        "Rating",
        "Review Creation Date"
      ];

      const csvRows = [
        headers.join(","),
        ...reviewsData.map((row: any) => {
          const reviewText = (row.review_text || "").replace(/"/g, '""').replace(/\n/g, " ");
          return [
            row.listing_id,
            `"${row.listing_title}"`,
            `"${row.listing_city}"`,
            `"${row.user_name}"`,
            `"${reviewText}"`,
            row.rating,
            format(new Date(row.review_created_at), "yyyy-MM-dd h:mm:ss a")
          ].join(",");
        })
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reviews_${listing.listing_title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Reviews report exported successfully");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export reviews");
    } finally {
      setExportingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No review data found for the selected period</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="font-semibold">Listing Name</TableHead>
            <TableHead className="font-semibold">City</TableHead>
            <TableHead className="font-semibold text-right">Total Reviews</TableHead>
            <TableHead className="font-semibold text-right">Average Rating</TableHead>
            <TableHead className="font-semibold">Last Review</TableHead>
            <TableHead className="font-semibold text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:nth-child(even)]:bg-[#F8FAFF]">
          {data.map((row) => (
            <TableRow key={row.listing_id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{row.listing_title}</TableCell>
              <TableCell>{row.listing_city}</TableCell>
              <TableCell className="text-right font-medium">{row.total_reviews}</TableCell>
              <TableCell className="text-right font-medium">
                <div className="flex items-center justify-end gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{row.average_rating.toFixed(1)}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(row.last_review_date), "MMM dd, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleExportListing(row)}
                  disabled={exportingId === row.listing_id}
                >
                  {exportingId === row.listing_id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Export
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
