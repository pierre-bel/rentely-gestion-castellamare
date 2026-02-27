import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ListingCard from "@/components/shared/ListingCard";

const PopularBookings = () => {
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    const fetchPopularListings = async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "approved")
        .order("rating_count", { ascending: false })
        .limit(8);

      if (data) {
        setListings(data);
      }
    };
    fetchPopularListings();
  }, []);

  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl md:text-5xl font-medium">Popular Bookings</h2>
          <Link 
            to="/search" 
            className="text-foreground hover:underline font-medium text-lg"
          >
            See All
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularBookings;
