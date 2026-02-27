import { Link } from "react-router-dom";
import DestinationCard from "./DestinationCard";
import { useFeaturedDestinations } from "@/hooks/useFeaturedDestinations";
import { Skeleton } from "@/components/ui/skeleton";

const taglines = ["Urban Adventures", "City Escapes", "Discover Local Life", "Explore the City"];
const ctaTexts = ["Explore", "Discover", "Learn More", "See More"];

const FeaturedDestinations = () => {
  const { data: cities, isLoading } = useFeaturedDestinations();

  if (isLoading) {
    return (
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-4xl md:text-5xl font-medium">Featured Destinations</h2>
            <Link to="/search" className="text-foreground hover:underline font-medium text-lg">
              See All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!cities || cities.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl md:text-5xl font-medium">Featured Destinations</h2>
          <Link 
            to="/search" 
            className="text-foreground hover:underline font-medium text-lg"
          >
            See All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          {cities.map((city, index) => (
            <DestinationCard 
              key={city.id} 
              destination={{
                image: city.image,
                city: city.name,
                tagline: taglines[index % taglines.length],
                listingCount: city.listingCount,
                ctaText: ctaTexts[index % ctaTexts.length],
                searchQuery: city.name,
                city_id: city.id,
              }} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedDestinations;
