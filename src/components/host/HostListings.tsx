import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemoData } from "@/hooks/useDemoData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Eye, Edit, Loader2, Plus } from "lucide-react";

interface Listing {
  id: string;
  title: string;
  status: string;
  base_price: number;
  city: string;
  cover_image: string | null;
  rating_avg: number;
  rating_count: number;
}

export default function HostListings() {
  const { user } = useAuth();
  const { isDemoMode, getListings } = useDemoData();
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [user, isDemoMode]);

  const fetchListings = async () => {
    if (!user) return;

    if (isDemoMode) {
      // DEMO MODE: Get from localStorage
      const demoListings = getListings();
      setListings(demoListings);
      setLoading(false);
    } else {
      // REAL MODE: Fetch from Supabase
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, status, base_price, city, cover_image, rating_avg, rating_count")
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setListings(data);
      }
      setLoading(false);
    }
  };


  const handleCreateListing = () => {
    navigate("/host/create-listing", { state: { from: location.pathname } });
  };

  const activeListings = listings.filter(l => l.status === "approved");
  const draftListings = listings.filter(l => l.status === "draft" || l.status === "pending" || l.status === "rejected");

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const ListingCard = ({ listing }: { listing: Listing }) => (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {listing.cover_image ? (
          <img
            src={listing.cover_image}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Home className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold">{listing.title}</h3>
          <StatusBadge status={listing.status as any} />
        </div>
        <p className="text-sm text-muted-foreground">{listing.city}</p>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm font-medium">${listing.base_price}/night</p>
          {listing.rating_count > 0 && (
            <p className="text-sm text-muted-foreground">
              ⭐ {listing.rating_avg.toFixed(1)} ({listing.rating_count})
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/listing/${listing.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/host/edit-listing/${listing.id}`, { 
            state: { from: location.pathname } 
          })}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Your Listings</CardTitle>
          <Button onClick={handleCreateListing}>
            <Plus className="h-4 w-4 mr-2" />
            New Listing
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-4">Create your first listing to start hosting</p>
            <Button onClick={handleCreateListing}>
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Active ({activeListings.length})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({draftListings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeListings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active listings</p>
              ) : (
                <div className="space-y-3">
                  {activeListings.map(listing => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="draft">
              {draftListings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No draft listings</p>
              ) : (
                <div className="space-y-3">
                  {draftListings.map(listing => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
