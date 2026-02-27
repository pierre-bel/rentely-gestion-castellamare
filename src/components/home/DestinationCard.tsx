import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface DestinationCardProps {
  destination: {
    image: string;
    city: string;
    tagline: string;
    listingCount: number;
    ctaText: string;
    searchQuery: string;
    city_id?: string;
  };
}

const DestinationCard = ({ destination }: DestinationCardProps) => {
  return (
    <Link to={`/search?${destination.city_id ? `city_id=${destination.city_id}` : `location=${destination.searchQuery}`}`}>
      <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* Image */}
        <div className="p-4 pb-0">
          <div className="aspect-[4/3] rounded-xl overflow-hidden">
            <img
              src={destination.image}
              alt={destination.city}
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col flex-1">
          <h3 className="text-2xl font-bold mb-2">{destination.city}</h3>
          <p className="text-text-secondary font-sans text-base mb-1">
            {destination.tagline}
          </p>
          <p className="text-text-secondary font-sans text-sm mb-6">
            {destination.listingCount} Listings
          </p>

          {/* CTA - pushed to bottom */}
          <div className="mt-auto">
            <span className="inline-flex items-center gap-2 font-semibold text-foreground hover:gap-3 transition-all">
              {destination.ctaText}
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default DestinationCard;
