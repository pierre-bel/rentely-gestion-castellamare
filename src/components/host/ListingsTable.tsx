import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Edit, Calendar } from "lucide-react";

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
}

interface ListingsTableProps {
  listings: Listing[];
  loading: boolean;
  onEditClick: (listingId: string) => void;
  onAvailabilityClick: (listing: Listing) => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const formatLocation = (city: string, state: string | null, country: string) => {
  if (state) {
    return `${city}, ${state}`;
  }
  return `${city}, ${country}`;
};

export const ListingsTable = ({ listings, loading, onEditClick, onAvailabilityClick }: ListingsTableProps) => {
  if (loading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Title</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Base Price</TableHead>
              <TableHead className="font-semibold">Rating</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className={i % 2 === 0 ? "bg-[#F8FAFF]" : ""}>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground text-lg">No listings found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Title</TableHead>
            <TableHead className="font-semibold">Location</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Base Price</TableHead>
            <TableHead className="font-semibold">Rating</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing, index) => (
            <TableRow 
              key={listing.id}
              className={index % 2 === 0 ? "bg-[#F8FAFF]" : ""}
            >
              <TableCell>
                <StatusBadge status={listing.status as any} />
              </TableCell>
              <TableCell className="font-medium">{listing.title}</TableCell>
              <TableCell>{formatLocation(listing.city, listing.state, listing.country)}</TableCell>
              <TableCell className="capitalize">{listing.type}</TableCell>
              <TableCell>{formatPrice(listing.base_price)}</TableCell>
              <TableCell>
                {listing.rating_count > 0 ? (
                  <div className="flex items-center gap-1">
                    <span>⭐</span>
                    <span>{listing.rating_avg.toFixed(1)}</span>
                    <span className="text-muted-foreground text-sm">({listing.rating_count})</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">No reviews</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditClick(listing.id)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAvailabilityClick(listing)}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Availability
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
