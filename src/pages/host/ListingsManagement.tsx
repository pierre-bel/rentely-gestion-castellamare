import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemoData } from "@/hooks/useDemoData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import StepAvailability from "@/components/listing/StepAvailability";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListingsFiltersSheet } from "@/components/host/ListingsFiltersSheet";
import { ListingsTable } from "@/components/host/ListingsTable";
import type { ListingFormData } from "@/pages/host/CreateListing";

interface Listing {
  id: string;
  title: string;
  status: "approved" | "draft" | "pending" | "blocked" | "rejected";
  type: string;
  city: string;
  state: string | null;
  country: string;
  base_price: number;
  cover_image: string | null;
  rating_avg: number;
  rating_count: number;
  availability_rules?: any[];
}

const ListingsManagement = () => {
  const { user } = useAuth();
  const { isDemoMode, getListingsFiltered, getAvailabilityRules, updateAvailabilityRules } = useDemoData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortValue, setSortValue] = useState("created_at-desc");
  const { toast } = useToast();

  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: [
      "host-listings",
      user?.id,
      debouncedSearch,
      statusFilter,
      minPrice,
      maxPrice,
      sortValue,
      isDemoMode,
    ],
    queryFn: async () => {
      if (!user?.id) return [];

      if (isDemoMode) {
        // DEMO MODE: Use localStorage with client-side filtering
        const [sortBy, sortOrder] = sortValue.split("-");
        
        return getListingsFiltered({
          searchQuery: debouncedSearch || null,
          statusFilter: statusFilter !== "all" ? statusFilter : null,
          minPrice: minPrice ? parseFloat(minPrice) : null,
          maxPrice: maxPrice ? parseFloat(maxPrice) : null,
          sortBy,
          sortOrder,
        });
      } else {
        // REAL MODE: Use Supabase RPC
        const [sortBy, sortOrder] = sortValue.split("-");
        const { data, error } = await supabase.rpc("host_search_listings", {
          host_id: user.id,
          search_query: debouncedSearch || null,
          status_filter: statusFilter !== "all" ? (statusFilter as any) : null,
          min_price: minPrice ? parseFloat(minPrice) : null,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
          sort_by: sortBy,
          sort_order: sortOrder,
        });

        if (error) throw error;
        return data as Listing[];
      }
    },
    enabled: !!user?.id,
  });

  const handleApplyFilters = (filters: {
    statusFilter: string;
    minPrice: string;
    maxPrice: string;
  }) => {
    setStatusFilter(filters.statusFilter);
    setMinPrice(filters.minPrice);
    setMaxPrice(filters.maxPrice);
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setMinPrice("");
    setMaxPrice("");
  };

  const handleCreateListing = () => {
    navigate("/host/create-listing", { state: { from: location.pathname } });
  };

  const handleEditClick = (listingId: string) => {
    navigate(`/host/edit-listing/${listingId}`, { 
      state: { from: location.pathname } 
    });
  };

  const handleDuplicateListing = async (listingId: string) => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select(`*, listing_rooms(id, room_type, name, beds, features, sort_order)`)
        .eq("id", listingId)
        .single();

      if (error || !data) {
        toast({ title: "Erreur", description: "Impossible de charger l'annonce.", variant: "destructive" });
        return;
      }

      const duplicateData: ListingFormData = {
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        postal_code: data.postal_code || "",
        country: data.country || "USA",
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        city_id: data.city_id || null,
        state_region_id: data.state_region_id || null,
        country_id: data.country_id || null,
        title: data.title || "",
        description: data.description || "",
        type: data.type || "apartment",
        guests_max: data.guests_max || 1,
        bedrooms: data.bedrooms || 1,
        beds: data.beds || 1,
        bathrooms: data.bathrooms || 1,
        square_feet: data.size_sqft || 0,
        amenities: data.amenities || [],
        cover_image: data.cover_image || "",
        images: data.images || [],
        check_in_time: data.checkin_from || "14:00",
        check_out_time: data.checkout_until || "11:00",
        min_nights: data.min_nights || 1,
        max_nights: data.max_nights || 30,
        house_rules: data.house_rules || "",
        cancellation_policy_id: data.cancellation_policy_id || null,
        cleaning_fee: data.cleaning_fee ?? null,
        base_price: data.base_price || 0,
        weekly_discount: data.weekly_discount || 0,
        monthly_discount: data.monthly_discount || 0,
        rooms: ((data as any).listing_rooms as any[] || []).map((r: any) => ({
          id: crypto.randomUUID(),
          room_type: r.room_type || "bedroom",
          name: r.name || "",
          beds: r.beds || [],
          features: r.features || [],
          sort_order: r.sort_order || 0,
        })),
        availability_rules: [],
      };

      navigate("/host/create-listing", { state: { from: location.pathname, duplicateData } });
      toast({ title: "Annonce dupliquée", description: "Modifiez les informations puis enregistrez." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleAvailabilityClick = async (listing: Listing) => {
    if (isDemoMode) {
      // DEMO MODE: Fetch from localStorage
      const availabilityRules = getAvailabilityRules(listing.id);
      
      const formattedRules = availabilityRules.map(rule => ({
        id: rule.id,
        startDate: rule.start_date,
        endDate: rule.end_date,
        price: rule.price,
      }));
      
      setSelectedListing({ ...listing, availability_rules: formattedRules });
      setIsAvailabilityDialogOpen(true);
    } else {
      // REAL MODE: Fetch from Supabase
      const { data: availabilityData } = await supabase
        .from("listing_availability")
        .select("*")
        .eq("listing_id", listing.id)
        .order("start_date", { ascending: true });

      // Convert snake_case from DB to camelCase for StepAvailability component
      const formattedRules = (availabilityData || []).map(rule => ({
        id: rule.id,
        startDate: rule.start_date,
        endDate: rule.end_date,
        price: rule.price
      }));

      setSelectedListing({ ...listing, availability_rules: formattedRules });
      setIsAvailabilityDialogOpen(true);
    }
  };

  const handleSaveAvailability = async (availabilityRules: any[]) => {
    if (!selectedListing || !user) return;
    
    setIsSaving(true);
    
    try {
      if (isDemoMode) {
        // DEMO MODE: Update localStorage
        // Convert camelCase to snake_case to match database schema
        const rulesWithSnakeCase = availabilityRules.map(rule => ({
          id: rule.id,
          start_date: rule.startDate,
          end_date: rule.endDate,
          price: rule.price,
        }));
        
        updateAvailabilityRules(selectedListing.id, rulesWithSnakeCase);
        
        // Invalidate query to refetch listings
        await queryClient.invalidateQueries({ 
          queryKey: ["host-listings"] 
        });
        
        // Update selected listing state to reflect changes in UI
        setSelectedListing(prev => prev ? {
          ...prev,
          availability_rules: availabilityRules
        } : null);
        
        toast({
          title: "Succès",
          description: "Disponibilités mises à jour",
        });
      } else {
        // REAL MODE: Update Supabase
        await supabase
          .from("listing_availability")
          .delete()
          .eq("listing_id", selectedListing.id);

        if (availabilityRules.length > 0) {
          const rulesToInsert = availabilityRules.map(rule => ({
            listing_id: selectedListing.id,
            start_date: rule.startDate,
            end_date: rule.endDate,
            price: rule.price,
          }));

          const { error } = await supabase
            .from("listing_availability")
            .insert(rulesToInsert);

          if (error) throw error;
        }

        // Invalidate query to refetch listings
        await queryClient.invalidateQueries({ 
          queryKey: ["host-listings"] 
        });

        setSelectedListing(prev => prev ? {
          ...prev,
          availability_rules: availabilityRules
        } : null);
        
        toast({
          title: "Succès",
          description: "Disponibilités mises à jour",
        });
      }
    } catch (error) {
      console.error("Error saving availability:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les disponibilités",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pb-8 lg:px-8">
      <Card className="bg-card">
        <CardContent className="p-6">
          {/* Controls Row */}
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            {/* Search Input - Left */}
            <div className="relative flex-1 max-w-md min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par titre, ville ou type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Filter, Sort and Create - Right */}
            <div className="flex items-center gap-2">
              <ListingsFiltersSheet
                statusFilter={statusFilter}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
              />

              <Select value={sortValue} onValueChange={setSortValue}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Date : plus récent</SelectItem>
                  <SelectItem value="created_at-asc">Date : plus ancien</SelectItem>
                  <SelectItem value="base_price-desc">Prix : décroissant</SelectItem>
                  <SelectItem value="base_price-asc">Prix : croissant</SelectItem>
                  <SelectItem value="rating_avg-desc">Note : décroissante</SelectItem>
                  <SelectItem value="rating_avg-asc">Note : croissante</SelectItem>
                  <SelectItem value="updated_at-desc">Mis à jour récemment</SelectItem>
                  <SelectItem value="updated_at-asc">Mis à jour anciennement</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleCreateListing}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle annonce
              </Button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <ListingsTable
              listings={listings}
              loading={isLoading}
              onEditClick={handleEditClick}
              onAvailabilityClick={handleAvailabilityClick}
              onDuplicateClick={handleDuplicateListing}
            />
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : listings.length === 0 ? (
              <div className="bg-card rounded-lg border p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" || minPrice || maxPrice
                    ? "Aucune annonce trouvée. Essayez de modifier vos filtres."
                    : "Aucune annonce. Créez votre première annonce pour commencer."
                  }
                </p>
              </div>
            ) : (
              listings.map((listing) => (
                <div key={listing.id} className="bg-card rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {listing.city}, {listing.state || listing.country}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">{listing.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(listing.base_price)}/nuit</p>
                      {listing.rating_count > 0 && (
                        <p className="text-sm text-muted-foreground">
                          ⭐ {listing.rating_avg.toFixed(1)} ({listing.rating_count})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditClick(listing.id)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAvailabilityClick(listing)}
                    >
                      Disponibilités
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateListing(listing.id)}
                      title="Dupliquer"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Availability Dialog */}
      <Dialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gérer les disponibilités - {selectedListing?.title}</DialogTitle>
          </DialogHeader>
          {selectedListing && (
            <StepAvailability
              formData={{
                availability_rules: selectedListing.availability_rules || [],
                base_price: selectedListing.base_price,
                currency: 'EUR',
                title: selectedListing.title
              }}
              updateFormData={(data) => {
                if (data.availability_rules) {
                  handleSaveAvailability(data.availability_rules);
                }
              }}
              listingId={selectedListing.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingsManagement;
