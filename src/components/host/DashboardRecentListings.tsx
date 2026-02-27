import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoData } from "@/hooks/useDemoData";
import { useNavigate } from "react-router-dom";
import { Edit, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardRecentListingsProps {
  userId: string;
}

const DashboardRecentListings = ({ userId }: DashboardRecentListingsProps) => {
  const navigate = useNavigate();
  const { isDemoMode, getListingsFiltered } = useDemoData();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["dashboard-recent-listings", userId, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        // DEMO MODE: Get from localStorage, sorted by updated_at desc
        const allListings = getListingsFiltered({
          searchQuery: null,
          statusFilter: null,
          minPrice: null,
          maxPrice: null,
          sortBy: "updated_at",
          sortOrder: "desc",
        });
        
        return allListings.slice(0, 6); // Most recent 6
      } else {
        // REAL MODE: Use Supabase RPC
        const { data, error } = await supabase.rpc("host_search_listings", {
          host_id: userId,
          search_query: null,
          status_filter: null,
          min_price: null,
          max_price: null,
          sort_by: "updated_at",
          sort_order: "desc",
        });

        if (error) throw error;
        return data?.slice(0, 6) || [];
      }
    },
  });

  const handleEdit = (listingId: string) => {
    navigate(`/host/edit-listing/${listingId}`, { state: { from: "/host/dashboard" } });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No listings yet</p>
        <Button onClick={() => navigate("/host/create-listing", { state: { from: "/host/dashboard" } })}>
          + Add Your First Listing
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-[#D5DAE7] rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing, index) => (
            <TableRow
              key={listing.id}
              className={index % 2 === 0 ? "bg-[#F8FAFF]" : ""}
            >
              <TableCell className="font-medium">{listing.title}</TableCell>
              <TableCell>
                {listing.city}
                {listing.state ? `, ${listing.state}` : ""}, {listing.country}
              </TableCell>
              <TableCell>
                {listing.rating_avg > 0 ? (
                  <span>
                    ⭐ {listing.rating_avg.toFixed(1)} ({listing.rating_count})
                  </span>
                ) : (
                  <span className="text-muted-foreground">No reviews</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={listing.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(listing.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate(`/host/listings?availability=${listing.id}`)
                    }
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DashboardRecentListings;
