import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoData } from "@/hooks/useDemoData";
import { useNavigate } from "react-router-dom";
import { Edit, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
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
        const allListings = getListingsFiltered({
          searchQuery: null, statusFilter: null, minPrice: null, maxPrice: null,
          sortBy: "updated_at", sortOrder: "desc",
        });
        return allListings.slice(0, 6);
      } else {
        const { data, error } = await supabase.rpc("host_search_listings", {
          host_id: userId, search_query: null, status_filter: null,
          min_price: null, max_price: null, sort_by: "updated_at", sort_order: "desc",
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
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Aucune annonce</p>
        <Button onClick={() => navigate("/host/create-listing", { state: { from: "/host/dashboard" } })}>
          + Créer votre première annonce
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {listings.map((listing) => (
          <div key={listing.id} className="p-3 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-sm truncate flex-1">{listing.title}</p>
              <StatusBadge status={listing.status} />
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {listing.city}{listing.state ? `, ${listing.state}` : ""}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {listing.rating_avg > 0 ? `⭐ ${listing.rating_avg.toFixed(1)} (${listing.rating_count})` : "Aucun avis"}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(listing.id)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/host/listings?availability=${listing.id}`)}>
                  <Calendar className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((listing, index) => (
              <TableRow key={listing.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                <TableCell className="font-medium">{listing.title}</TableCell>
                <TableCell>
                  {listing.city}
                  {listing.state ? `, ${listing.state}` : ""}, {listing.country}
                </TableCell>
                <TableCell>
                  {listing.rating_avg > 0 ? (
                    <span>⭐ {listing.rating_avg.toFixed(1)} ({listing.rating_count})</span>
                  ) : (
                    <span className="text-muted-foreground">Aucun avis</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={listing.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(listing.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/host/listings?availability=${listing.id}`)}>
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default DashboardRecentListings;
