import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Home, Calendar, Users, MapPin, Loader2, Mail, HelpCircle, Bed, Bath } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDemoData } from "@/hooks/useDemoData";

interface Booking {
  id: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  guests: number;
  subtotal: number;
  cleaning_fee: number;
  service_fee: number;
  taxes: number;
  total_price: number;
  status: string;
  created_at: string;
  guest_user_id: string;
  listings: {
    title: string;
    address: string;
    city: string;
    state: string;
    country: string;
    cover_image: string;
    base_price: number;
    checkin_from: string;
    checkout_until: string;
    type: string;
    size_sqft: number;
    guests_max: number;
    beds: number;
    bedrooms: number;
    bathrooms: number;
  };
}

const BookingConfirmation = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { isDemoMode, getBooking } = useDemoData();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [guestEmail, setGuestEmail] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("Guest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (isDemoMode && id) {
        // Get booking from localStorage for demo mode
        const demoBooking = getBooking(id);
        if (demoBooking) {
          setBooking(demoBooking as any);
          setGuestEmail("guest@demo.com");
          setGuestName("Demo Guest");
        }
        setLoading(false);
        return;
      }

      // Regular DB fetch for non-demo users
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          listings (
            title,
            address,
            city,
            state,
            country,
            cover_image,
            base_price,
            checkin_from,
            checkout_until,
            type,
            size_sqft,
            guests_max,
            beds,
            bedrooms,
            bathrooms
          )
        `)
        .eq("id", id)
        .single();

      if (!error && data) {
        setBooking(data as any);
        
        // Fetch guest profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("id", data.guest_user_id)
          .single();
          
        if (profileData) {
          setGuestEmail(profileData.email);
          const name = `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim();
          if (name) setGuestName(name);
        }
      }
      setLoading(false);
    };

    if (id) {
      fetchBooking();
    }
  }, [id, isDemoMode, getBooking]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Booking not found</h3>
            <Button asChild>
              <Link to="/search">Browse Listings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pricePerNight = booking ? booking.subtotal / booking.nights : 0;

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-success/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you, {guestName}! Your payment has been received and your stay is confirmed.
          </p>
          <p className="text-muted-foreground">
            A confirmation email with your booking details, check-in instructions, and receipt has been sent to {guestEmail}.
          </p>
        </div>

        {/* What's Next Section */}
        <div className="mb-8 bg-white border border-[#D5DAE7] rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-6">What's next?</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Mail className="h-5 w-5 text-primary" />
                Check Your Email
              </h3>
              <p className="text-muted-foreground ml-7">
                Your booking confirmation and arrival details are in your inbox.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-primary" />
                Plan Your Stay
              </h3>
              <p className="text-muted-foreground ml-7">
                Review check-in time, house rules, and local recommendations in your confirmation email.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Need Help?
              </h3>
              <p className="text-muted-foreground ml-7">
                Contact your host directly from your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Booking Overview Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Booking Overview</h2>
          
          {/* Property Info Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="h-24 w-32 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={booking.listings.cover_image}
                    alt={booking.listings.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{booking.listings.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {booking.listings.address}, {booking.listings.city}
                      {booking.listings.state && `, ${booking.listings.state}`}, {booking.listings.country}
                    </span>
                  </div>
                  
                  {/* Property Details */}
                  <div className="flex items-center gap-3 text-foreground flex-wrap">
                    <span className="capitalize">{booking.listings.type}</span>
                    <span>•</span>
                    <span>{booking.listings.bedrooms} Rooms</span>
                    <span>•</span>
                    <span>{booking.listings.bathrooms} Bathrooms</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Three Column Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status and Booking ID */}
            <Card className="bg-[#F8FAFF]">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Status and Booking ID</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <p className="font-semibold">Confirmed</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Booking ID</p>
                    <p className="font-mono text-sm">{booking.id.substring(0, 13).toUpperCase()}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Receipt Sent To</p>
                    <p className="text-sm break-all">{guestEmail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Overview */}
            <Card className="bg-[#F8FAFF]">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Booking Overview</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Where you'll be staying</p>
                    <p className="text-sm font-medium">
                      {booking.listings.address}, {booking.listings.city}, {booking.listings.country}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Check-in</p>
                      <p className="font-medium text-sm">
                        {format(new Date(booking.checkin_date), "MMMM d, h:mm a")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Check-out</p>
                      <p className="font-medium text-sm">
                        {format(new Date(booking.checkout_date), "MMMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Number of guests</p>
                    <p className="font-medium">{booking.guests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Overview */}
            <Card className="bg-[#F8FAFF]">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Payment Overview</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>${pricePerNight.toFixed(2)} x {booking.nights} nights</span>
                    <span className="font-medium">${booking.subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Cleaning Fee</span>
                    <span className="font-medium">${booking.cleaning_fee.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Service fee</span>
                    <span className="font-medium">${booking.service_fee.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      ${(booking.subtotal + booking.cleaning_fee + booking.service_fee).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Taxes</span>
                    <span className="font-medium">${(booking.taxes || 0).toFixed(2)}</span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${booking.total_price.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Notice */}
          <div className="bg-accent/50 p-4 rounded-lg mt-6">
            <p className="text-sm text-center">
              💳 Payment will be collected at the property during check-in
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button asChild className="flex-1">
            <Link to="/guest/bookings">View My Bookings</Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link to="/search">Browse More Listings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
