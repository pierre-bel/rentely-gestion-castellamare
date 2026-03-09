import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BookingWidget from "@/components/booking/BookingWidget";
import LocationMap from "@/components/listing/LocationMap";
import Footer from "@/components/Footer";
import { ReviewsSection } from "@/components/listing/ReviewsSection";
import { ContactHostDialog } from "@/components/listing/ContactHostDialog";
import { AuthDialog } from "@/components/AuthDialog";
import { format24to12Hour } from "@/lib/exportUtils";
import RoomDetailDisplay from "@/components/listing/RoomDetailDisplay";
import {
  MapPin,
  Users,
  Bed,
  Bath,
  Star,
  Home,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Listing {
  id: string;
  title: string;
  description: string;
  type: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  base_price: number;
  cleaning_fee: number;
  guests_max: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  min_nights: number;
  max_nights: number;
  size_sqft: number;
  checkin_from: string;
  checkout_until: string;
  amenities: string[];
  cover_image: string;
  images: string[];
  house_rules: string;
  cancellation_policy_id: string;
  weekly_discount: number;
  monthly_discount: number;
  cancellation_policy: {
    name: string;
    description: string;
  };
  rating_avg: number;
  rating_count: number;
  host_user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string;
    about: string;
  };
}

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    const fetchListing = async () => {
      // First fetch the listing with policy details
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select(`
          *,
          cancellation_policy:cancellation_policies(name, description)
        `)
        .eq("id", id)
        .eq("status", "approved")
        .maybeSingle();

      if (listingError || !listingData) {
        toast({
          title: "Error",
          description: "Failed to load listing",
          variant: "destructive",
        });
        navigate("/search");
        setLoading(false);
        return;
      }

      // Then fetch the host profile
      const { data: profileData } = await supabase
        .from("public_profiles")
        .select("first_name, last_name, avatar_url, about")
        .eq("id", listingData.host_user_id)
        .maybeSingle();

      setListing({
        ...listingData,
        profiles: profileData || {}
      } as any);

      // Fetch rooms
      const { data: roomsData } = await supabase
        .from("listing_rooms")
        .select("*")
        .eq("listing_id", id!)
        .order("sort_order");
      if (roomsData) setRooms(roomsData);

      setLoading(false);
    };

    if (id) {
      fetchListing();
    }
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Listing not found</h3>
            <Button onClick={() => navigate("/search")}>Browse Listings</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allImages = [listing.cover_image, ...listing.images].filter(Boolean);
  const hostName = `${listing.profiles?.first_name || ""} ${listing.profiles?.last_name || ""}`.trim() || "Host";

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-video w-full rounded-xl overflow-hidden group">
                <img
                  src={allImages[currentImageIndex]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                {allImages.length > 1 && (
                  <>
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-foreground rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    
                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-foreground rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Image Counter */}
                    <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex
                          ? "border-primary"
                          : "border-transparent hover:border-border"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${listing.title} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Header Section - Outside Gray Container */}
            <div className="space-y-3">
              {/* Rating - First */}
              {listing.rating_avg > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border border-foreground rounded-lg">
                    <span className="text-lg font-medium">{listing.rating_avg.toFixed(1)}</span>
                  </div>
                  <span className="text-lg text-foreground">{listing.rating_count} reviews</span>
                </div>
              )}
              
              {/* Main Title */}
              <h1 className="text-[48px] font-medium leading-tight">{listing.title}</h1>
              
              {/* Key Specs */}
              <div className="flex items-center gap-3 text-foreground">
                <span className="flex items-center gap-1.5">
                  {listing.type}
                  <Home className="h-4 w-4" />
                </span>
                {listing.size_sqft && (
                  <>
                    <span>•</span>
                    <span>{listing.size_sqft} sq ft</span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  {listing.beds} Beds
                  <Bed className="h-4 w-4" />
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  {listing.bedrooms} Rooms
                  <Home className="h-4 w-4" />
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  {listing.bathrooms} Bathrooms
                  <Bath className="h-4 w-4" />
                </span>
              </div>
            </div>

            {/* Consolidated Content Block */}
            <div className="bg-[#F8FAFF] rounded-xl p-8 space-y-8">

              {/* About this property */}
              {listing.description && (
                <>
                  <div>
                    <h3 className="text-2xl font-medium mb-4">About this property</h3>
                    <p className="text-foreground whitespace-pre-wrap">
                      {listing.description}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Amenities */}
              {listing.amenities && listing.amenities.length > 0 && (
                <>
                  <div>
                    <h3 className="text-2xl font-medium mb-4">Amenities</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {listing.amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* House Rules */}
              <div>
                <h3 className="text-2xl font-medium mb-4">Rules</h3>
                {listing.house_rules && (
                  <>
                    <p className="text-foreground mb-3">When staying at this property, please adhere to the following rules:</p>
                    <ul className="list-disc list-inside space-y-2 text-foreground mb-4">
                      {listing.house_rules.split('\n').filter(rule => rule.trim()).map((rule, idx) => (
                        <li key={idx}>{rule.trim()}</li>
                      ))}
                    </ul>
                  </>
                )}
                <ul className="list-disc list-inside space-y-2 text-foreground">
                  <li>Check-in is at {listing.checkin_from ? format24to12Hour(listing.checkin_from) : '3:00 PM'} and check-out is at {listing.checkout_until ? format24to12Hour(listing.checkout_until) : '11:00 AM'}.</li>
                </ul>
              </div>
              
              <Separator />

              {/* Cancellation Policy */}
              <div>
                <h3 className="text-2xl font-medium mb-4">Cancellation Policy</h3>
                <p className="text-foreground">
                  {listing.cancellation_policy?.description || "Contact host for cancellation policy details."}
                </p>
              </div>

            </div>

            {/* Property Location Section */}
            <div className="bg-[#F8FAFF] rounded-xl p-8 space-y-6">
              <h2 className="text-2xl font-medium">Property Location</h2>
              
              {listing.latitude && listing.longitude && (
                <LocationMap 
                  latitude={listing.latitude} 
                  longitude={listing.longitude}
                />
              )}
              
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="h-5 w-5 flex-shrink-0" />
                <span>
                  {[
                    listing.address,
                    listing.city,
                    listing.state,
                    listing.postal_code,
                    listing.country
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>

            {/* Reviews Section */}
            <ReviewsSection
              listingId={listing.id}
              averageRating={listing.rating_avg || 0}
              reviewCount={listing.rating_count || 0}
            />

            {/* Host Info - Separate Container */}
            <div className="bg-[#F8FAFF] rounded-xl p-8">
              <h3 className="text-2xl font-medium mb-4">Meet your host</h3>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={listing.profiles?.avatar_url} />
                  <AvatarFallback>
                    {hostName.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1">{hostName}</h4>
                  {listing.profiles?.about && (
                    <p className="text-muted-foreground mb-3">{listing.profiles.about}</p>
                  )}
                  {user?.id !== listing.host_user_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      onClick={() => {
                        if (!user) {
                          setAuthDialogOpen(true);
                        } else {
                          setContactDialogOpen(true);
                        }
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contact Host
                    </Button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 self-start">
              <BookingWidget listing={listing} />
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <Footer />

      {/* Contact Host Dialog */}
      {listing && (
        <ContactHostDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          listingId={listing.id}
          hostId={listing.host_user_id}
          listingTitle={listing.title}
        />
      )}

      {/* Auth Dialog for non-logged-in users */}
      <AuthDialog 
        open={authDialogOpen} 
        onOpenChange={setAuthDialogOpen} 
      />
    </div>
  );
};

export default ListingDetail;
