import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useDemoData } from "@/hooks/useDemoData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListingsFiltersSheet } from "@/components/admin/ListingsFiltersSheet";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Listing {
  id: string;
  title: string;
  status: "approved" | "draft" | "pending" | "blocked" | "rejected";
  type: string;
  city: string;
  state: string | null;
  country: string;
  base_price: number;
  cover_image: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  host_user_id: string;
  host_first_name: string | null;
  host_last_name: string | null;
}

const ListingsManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDemoMode, getAdminListings, updateAdminListingStatus } = useDemoData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortValue, setSortValue] = useState("created_at-desc");
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [listingToBlock, setListingToBlock] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch listings with filters and sorting
  const { data: listings = [], isLoading } = useQuery({
    queryKey: [
      "admin-listings",
      debouncedSearch,
      statusFilter,
      minPrice,
      maxPrice,
      sortValue,
    ],
    queryFn: async () => {
      if (isDemoMode) {
        // DEMO MODE: Get from localStorage
        const [sortBy, sortOrder] = sortValue.split("-");
        return getAdminListings({
          searchQuery: debouncedSearch || null,
          statusFilter: statusFilter !== "all" ? statusFilter : null,
          minPrice: minPrice ? parseFloat(minPrice) : null,
          maxPrice: maxPrice ? parseFloat(maxPrice) : null,
          sortBy,
          sortOrder,
        });
      } else {
        // REAL MODE: Query Supabase
        const [sortBy, sortOrder] = sortValue.split("-");

        const { data, error } = await supabase.rpc("admin_search_listings", {
          search_query: debouncedSearch || null,
          status_filter: statusFilter !== "all" ? (statusFilter as any) : null,
          min_price: minPrice ? parseFloat(minPrice) : null,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
          sort_by: sortBy,
          sort_order: sortOrder,
        });

        if (error) throw error;
        return data as Listing[];
      }
    },
  });

  const handleApplyFilters = (filters: {
    statusFilter: string;
    minPrice: string;
    maxPrice: string;
  }) => {
    setStatusFilter(filters.statusFilter);
    setMinPrice(filters.minPrice);
    setMaxPrice(filters.maxPrice);
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setMinPrice("");
    setMaxPrice("");
  };

  const handleBlockListing = async () => {
    if (!listingToBlock) return;

    if (isDemoMode) {
      // DEMO MODE: Update localStorage
      updateAdminListingStatus(listingToBlock, "blocked");
      await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast({ title: "Success", description: "Listing blocked successfully" });
    } else {
      // REAL MODE: Update Supabase
      const { error } = await supabase
        .from("listings")
        .update({ status: "blocked" })
        .eq("id", listingToBlock);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to block listing",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Listing blocked successfully",
        });
        await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      }
    }

    setBlockDialogOpen(false);
    setListingToBlock(null);
  };

  const handleUnblockListing = async (listingId: string) => {
    if (isDemoMode) {
      // DEMO MODE: Update localStorage
      updateAdminListingStatus(listingId, "pending");
      await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast({ title: "Success", description: "Listing unblocked successfully" });
    } else {
      // REAL MODE: Update Supabase
      const { error } = await supabase
        .from("listings")
        .update({ status: "pending" })
        .eq("id", listingId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to unblock listing",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Listing unblocked successfully",
        });
        await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      }
    }
  };

  return (
    <div className="pb-8">
      <Card className="bg-card">
        <CardContent className="py-6">
          {/* Controls Row */}
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            {/* Search Input - Left */}
            <div className="relative flex-1 max-w-md min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by listing, host, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Filter and Sort - Right */}
            <div className="flex items-center gap-2">
              <ListingsFiltersSheet
                statusFilter={statusFilter}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
              />

              <Select value={sortValue} onValueChange={setSortValue}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Date: Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Date: Oldest First</SelectItem>
                  <SelectItem value="base_price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="base_price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="rating_avg-desc">Rating: High to Low</SelectItem>
                  <SelectItem value="rating_avg-asc">Rating: Low to High</SelectItem>
                  <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
                  <SelectItem value="updated_at-asc">Least Recently Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="w-full py-12 flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {listings.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
                {searchQuery || statusFilter !== "all" || minPrice || maxPrice
                  ? "No listings found matching your filters. Try adjusting your search or filters."
                  : "No listings found."}
              </div>
            ) : (
              listings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-card rounded-lg border border-border p-5 space-y-3"
                >
                  <div>
                    <h3 className="font-semibold text-lg">{listing.title}</h3>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Host: </span>
                    {listing.host_first_name || ""} {listing.host_last_name || ""}
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">City: </span>
                    {listing.city}
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Created: </span>
                    {format(new Date(listing.created_at), "MMM dd, yyyy")}
                  </div>

                  <div className="flex items-center justify-between">
                    <StatusBadge status={listing.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {listing.status === "blocked" ? (
                          <DropdownMenuItem onClick={() => handleUnblockListing(listing.id)}>
                            Unblock
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              setListingToBlock(listing.id);
                              setBlockDialogOpen(true);
                            }}
                          >
                            Block
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {listing.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/admin/review-listing/${listing.id}`, {
                          state: { from: location.pathname },
                        })
                      }
                      className="w-full rounded-full"
                    >
                      Review
                    </Button>
                  )}
                  {listing.status === "approved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/listing/${listing.id}`)}
                      className="w-full rounded-full"
                    >
                      View
                    </Button>
                  )}
                </div>
              ))
            )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-background hover:bg-background">
                  <TableHead className="font-semibold">Listing</TableHead>
                  <TableHead className="font-semibold">Host</TableHead>
                  <TableHead className="font-semibold">City</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:nth-child(even)]:bg-[#F8FAFF]">
                {listings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== "all" || minPrice || maxPrice
                        ? "No listings found matching your filters. Try adjusting your search or filters."
                        : "No listings found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  listings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">{listing.title}</TableCell>
                      <TableCell>
                        {listing.host_first_name || ""} {listing.host_last_name || ""}
                      </TableCell>
                      <TableCell>{listing.city}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(listing.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={listing.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {listing.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(`/admin/review-listing/${listing.id}`, {
                                  state: { from: location.pathname },
                                })
                              }
                              className="rounded-full"
                            >
                              Review
                            </Button>
                          )}
                          {listing.status === "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/listing/${listing.id}`)}
                              className="rounded-full"
                            >
                              View
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {listing.status === "blocked" ? (
                                <DropdownMenuItem onClick={() => handleUnblockListing(listing.id)}>
                                  Unblock
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setListingToBlock(listing.id);
                                    setBlockDialogOpen(true);
                                  }}
                                >
                                  Block
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block this listing? This will prevent it from being visible
              to guests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockListing}>Block</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ListingsManagement;
