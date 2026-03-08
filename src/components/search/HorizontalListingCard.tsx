import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Bed, Home, Bath } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface HorizontalListingCardProps {
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
    address?: string;
    guests_max: number;
    beds: number;
    bedrooms: number;
    bathrooms: number;
  };
  dateRange?: DateRange;
}

const HorizontalListingCard = ({ listing, dateRange }: HorizontalListingCardProps) => {
  const [searchParams] = useSearchParams();
  
  // Calculate total price for date range
  const calculateTotalPrice = () => {
    if (dateRange?.from && dateRange?.to) {
      const nights = Math.ceil(
        (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        total: listing.base_price * nights,
        nights
      };
    }
    return null;
  };

  const priceInfo = calculateTotalPrice();

  return (
    <Link to={`/listing/${listing.id}?${searchParams.toString()}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer bg-white border border-gray-200 rounded-2xl group p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Image Section */}
          <div className="w-full sm:w-[240px] h-[200px] flex-shrink-0 overflow-hidden rounded-xl">
            <img 
              src={listing.cover_image || "/placeholder.svg"} 
              alt={listing.title}
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg";
              }}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" 
            />
          </div>

          {/* Content Section */}
          <CardContent className="flex-1 p-0">
            {/* Top Row: Rating + Total Price */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#0F766E] text-white hover:bg-[#0F766E] font-semibold">
                  {listing.rating_avg.toFixed(1)}
                </Badge>
                <span className="text-sm text-gray-600">
                  {listing.rating_count} reviews
                </span>
              </div>
              <div className="text-right">
                <p className="font-bold text-2xl text-gray-900">
                  ${priceInfo ? priceInfo.total : listing.base_price}
                </p>
                <p className="text-sm text-muted-foreground">
                  {priceInfo ? `$${priceInfo.total} for ${priceInfo.nights} night${priceInfo.nights !== 1 ? 's' : ''}` : 'per night'}
                </p>
              </div>
            </div>

            {/* Location Metadata Row - BEFORE Title */}
            <p className="text-sm text-gray-600 mb-1">
              {listing.city}, {listing.country} • {listing.type}
              {listing.size_sqft && ` • ${listing.size_sqft.toLocaleString()} sq ft`}
            </p>

            {/* Main Heading - listing.title (prominent) */}
            <h3 className="font-semibold text-lg text-gray-900 mb-3 line-clamp-2">
              {listing.title}
            </h3>

            {/* Specs Row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
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

            {/* Date Range */}
            {dateRange?.from && (
              <p className="text-sm text-purple-600 font-medium">
                {format(dateRange.from, "MMM d")} - {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : format(dateRange.from, "MMM d, yyyy")}
              </p>
            )}
          </CardContent>
        </div>
      </Card>
    </Link>
  );
};

export default HorizontalListingCard;
