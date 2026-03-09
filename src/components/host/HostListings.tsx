import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { selectByOwner } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemoData } from "@/hooks/useDemoData";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Eye, Edit, Loader2, Plus, Copy } from "lucide-react";
import type { ListingFormData } from "@/pages/host/CreateListing";

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
  const { toast } = useToast();
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
      // REAL MODE: Fetch via helper
      const { data, error } = await selectByOwner<Listing>(
        "listings", "host_user_id", user.id,
        { select: "id, title, status, base_price, city, cover_image, rating_avg, rating_count", order: "created_at", ascending: false }
      );

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
          <p className="text-sm font-medium">{listing.base_price} €/nuit</p>
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
          <CardTitle>Vos annonces</CardTitle>
           <Button onClick={handleCreateListing}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle annonce
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune annonce</h3>
            <p className="text-muted-foreground mb-4">Créez votre première annonce pour commencer</p>
            <Button onClick={handleCreateListing}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une annonce
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Actives ({activeListings.length})</TabsTrigger>
              <TabsTrigger value="draft">Brouillons ({draftListings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeListings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune annonce active</p>
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
                <p className="text-center text-muted-foreground py-8">Aucun brouillon</p>
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
