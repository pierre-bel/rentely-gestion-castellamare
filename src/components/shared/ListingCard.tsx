import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Bed, Home, Bath } from "lucide-react";

interface ListingCardProps {
  listing: {
    id: string;
    cover_image: string;
    rating_avg: number;
    rating_count: number;
    base_price: number;
    city: string;
    country: string;
    type: string;
    size_sqft?: number;
    title: string;
    guests_max: number;
    beds: number;
    bedrooms: number;
    bathrooms: number;
  };
}

const ListingCard = ({ listing }: ListingCardProps) => {
  const [searchParams] = useSearchParams();
  
  return (
    <Link to={`/listing/${listing.id}?${searchParams.toString()}`} className="h-full">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-card-bg border-card-border h-full flex flex-col">
        <div className="p-4 pb-0">
          <div className="aspect-[4/3] relative overflow-hidden rounded-xl">
            <img 
              src={listing.cover_image || "/placeholder.svg"} 
              alt={listing.title}
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg";
              }}
              className="object-cover w-full h-full hover:scale-105 transition-transform duration-300" 
            />
          </div>
        </div>
        <CardContent className="p-4 flex-1 flex flex-col">
          {/* Rating and Price */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-semibold">
                {listing.rating_avg.toFixed(1)}
              </Badge>
              <span className="text-sm text-[#5D6174]">
                {listing.rating_count} reviews
              </span>
            </div>
            <p className="font-bold text-lg">${listing.base_price}</p>
          </div>

          {/* Metadata */}
          <p className="text-sm text-[#5D6174] mb-2">
            {listing.city}, {listing.country} • {listing.type}
            {listing.size_sqft && ` • ${listing.size_sqft.toLocaleString()} sq ft`}
          </p>

          {/* Title */}
          <p className="font-sans font-normal text-base mb-3 line-clamp-2">
            {listing.title}
          </p>

          {/* Specs */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5D6174] mt-auto">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{listing.beds} Beds</span>
            </div>
            <div className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>{listing.bedrooms} Rooms</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{listing.bathrooms} Bathrooms</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ListingCard;
