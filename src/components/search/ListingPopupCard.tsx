import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { X } from "lucide-react";

interface ListingPopupCardProps {
  listing: {
    id: string;
    title: string;
    city: string;
    country: string;
    base_price: number;
    cover_image?: string;
    images?: string[];
  };
  dateRange?: DateRange;
}

const ListingPopupCard = ({ listing, dateRange }: ListingPopupCardProps) => {
  const imageUrl = listing.cover_image?.startsWith('http')
    ? listing.cover_image
    : supabase.storage
        .from('listing-images')
        .getPublicUrl(listing.cover_image || listing.images?.[0] || '').data.publicUrl;

  // Calculate total price and nights if date range exists
  const calculateTotalPrice = () => {
    if (dateRange?.from && dateRange?.to) {
      const nights = differenceInDays(dateRange.to, dateRange.from);
      const total = listing.base_price * nights;
      return { total, nights };
    }
    return null;
  };

  const priceInfo = calculateTotalPrice();

  return (
    <a href={`/listing/${listing.id}`} className="block w-52 bg-card rounded-lg shadow-lg overflow-hidden border border-border group">
      {/* Image */}
      <div className="relative overflow-hidden aspect-[3/2]">
        <img
          src={imageUrl}
          alt={listing.title}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
        {/* Close button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10"
          aria-label="Close popup"
        >
          <X className="w-3.5 h-3.5 text-gray-800" strokeWidth={2.5} />
        </button>
      </div>

      {/* Content */}
      <div className="p-2.5">
        <h4 className="font-semibold text-sm line-clamp-2 text-foreground mb-1.5">
          {listing.title}
        </h4>
        
        {priceInfo ? (
          <p className="text-sm text-foreground">
            <span className="font-bold">${priceInfo.total.toLocaleString()}</span>
            <span className="text-muted-foreground ml-1">
              for {priceInfo.nights} {priceInfo.nights === 1 ? 'night' : 'nights'}
            </span>
          </p>
        ) : (
          <p className="text-sm text-foreground">
            <span className="font-bold">${listing.base_price}</span>
            <span className="text-muted-foreground ml-1">per night</span>
          </p>
        )}
      </div>
    </a>
  );
};

export default ListingPopupCard;
