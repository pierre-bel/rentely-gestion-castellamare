import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { updateById, selectWhereIn } from "@/lib/supabase-helpers";
import { useNavigate } from "react-router-dom";
import { useDemoData } from "@/hooks/useDemoData";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface Listing {
  id: string;
  title: string;
  city: string;
  status: "approved" | "draft" | "pending" | "blocked" | "rejected";
  created_at: string;
  host_user_id: string;
  host_first_name?: string | null;
  host_last_name?: string | null;
}

const AdminDashboardRecentListings = () => {
  const navigate = useNavigate();
  const { isDemoMode, getAdminListings, updateAdminListingStatus } = useDemoData();

  const { data: listings, isLoading, refetch } = useQuery({
    queryKey: ["admin-dashboard-recent-listings"],
    queryFn: async () => {
      if (isDemoMode) {
        // DEMO MODE: Get from localStorage
        const allListings = getAdminListings({
          searchQuery: null,
          statusFilter: null,
          minPrice: null,
          maxPrice: null,
          sortBy: 'created_at',
          sortOrder: 'desc',
        });
        return allListings.slice(0, 5); // Limit to 5
      } else {
        // REAL MODE: Fetch from Supabase
        // Fetch 5 most recent listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select("id, title, city, status, created_at, host_user_id")
          .order("created_at", { ascending: false })
          .limit(5);

        if (listingsError) throw listingsError;
        if (!listingsData) return [];

        // Get unique host IDs
        const hostIds = [...new Set(listingsData.map(l => l.host_user_id))];

        // Fetch host profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", hostIds);

        // Map profiles to listings
        const profilesMap = new Map(
          profilesData?.map(p => [p.id, p]) || []
        );

        return listingsData.map(listing => ({
          ...listing,
          host_first_name: profilesMap.get(listing.host_user_id)?.first_name,
          host_last_name: profilesMap.get(listing.host_user_id)?.last_name,
        }));
      }
    },
  });

  const handleReview = (listingId: string) => {
    navigate(`/admin/review-listing/${listingId}`);
  };

  const handleBlockToggle = async (listingId: string, currentStatus: string) => {
    const newStatus = currentStatus === "blocked" ? "approved" : "blocked";
    
    if (isDemoMode) {
      // DEMO MODE: Update localStorage
      updateAdminListingStatus(listingId, newStatus);
      refetch();
      toast({ title: "Success", description: `Listing ${newStatus === "blocked" ? "blocked" : "unblocked"} successfully` });
    } else {
      // REAL MODE: Update Supabase
      const { error } = await supabase
        .from("listings")
        .update({ status: newStatus })
        .eq("id", listingId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update listing status",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Listing ${newStatus === "blocked" ? "blocked" : "unblocked"} successfully`,
        });
        refetch();
      }
    }
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
        <p className="text-muted-foreground">No listings yet</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Listing</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing, index) => (
            <TableRow
              key={listing.id}
              className={index % 2 === 0 ? "bg-muted/30" : ""}
            >
              <TableCell className="font-medium">{listing.title}</TableCell>
              <TableCell>
                {listing.host_first_name && listing.host_last_name
                  ? `${listing.host_first_name} ${listing.host_last_name}`
                  : "Unknown"}
              </TableCell>
              <TableCell>{listing.city}</TableCell>
              <TableCell>
                <StatusBadge status={listing.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {listing.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(listing.id)}
                      className="rounded-full"
                    >
                      Review
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleBlockToggle(listing.id, listing.status)}
                      >
                        {listing.status === "blocked" ? "Unblock" : "Block"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminDashboardRecentListings;
