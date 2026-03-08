import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, MapPin, Users, Bed, Bath, Home, Loader2 } from "lucide-react";

interface Listing {
  id: string;
  title: string;
  type: string;
  description: string | null;
  address: string;
  city: string;
  country: string;
  base_price: number;
  guests_max: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  cover_image: string;
  images: string[];
  amenities: string[];
  house_rules: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  host_user_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Props {
  listingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function ListingDetailDialog({ listingId, open, onOpenChange, onUpdate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchListing = async (id: string) => {
    setLoading(true);
    const { data: listingData, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !listingData) {
      setLoading(false);
      return;
    }

    // Fetch profile separately
    const { data: profileData } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", listingData.host_user_id)
      .maybeSingle();

    const combinedData = {
      ...listingData,
      profiles: profileData
    };

    setListing(combinedData as any);
    setRejectionReason(listingData.rejection_reason || "");
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!listing) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("listings")
      .update({
        status: "approved",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    setActionLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Listing approved",
        description: "The listing is now visible to guests",
      });
      onUpdate();
      onOpenChange(false);
    }
  };

  const handleReject = async () => {
    if (!listing || !rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);

    const { error } = await supabase
      .from("listings")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    setActionLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Listing rejected",
        description: "The host has been notified",
      });
      setShowRejectForm(false);
      setRejectionReason("");
      onUpdate();
      onOpenChange(false);
    }
  };


  useEffect(() => {
    if (open && listingId) {
      // Reset listing when listingId changes
      setListing(null);
      fetchListing(listingId);
    } else if (!open && listing) {
      // Reset state when dialog closes
      setListing(null);
      setShowRejectForm(false);
      setRejectionReason("");
    }
  }, [open, listingId]);

  if (!open || !listingId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading || !listing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl">{listing.title}</DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={listing.status as any} />
                    <Badge variant="outline" className="capitalize">
                      {listing.type}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${listing.base_price}</p>
                  <p className="text-sm text-muted-foreground">per night</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Images */}
              <div>
                <img
                  src={listing.cover_image}
                  alt={listing.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
                {listing.images && listing.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {listing.images.slice(1, 5).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${listing.title} ${idx + 2}`}
                        className="w-full h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h3>
                <p className="text-sm text-muted-foreground">
                  {listing.address}, {listing.city}, {listing.country}
                </p>
              </div>

              <Separator />

              {/* Property Details */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Property Details
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{listing.bedrooms}</p>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{listing.beds}</p>
                      <p className="text-xs text-muted-foreground">Beds</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{listing.bathrooms}</p>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {listing.description && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {listing.description}
                    </p>
                  </div>
                </>
              )}

              {/* Amenities */}
              {listing.amenities && listing.amenities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {listing.amenities.map((amenity) => (
                        <Badge key={amenity} variant="outline">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* House Rules */}
              {listing.house_rules && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">House Rules</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {listing.house_rules}
                    </p>
                  </div>
                </>
              )}

              {/* Host Info */}
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Host Information</h3>
                <p className="text-sm">
                  {listing.profiles?.first_name} {listing.profiles?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{listing.profiles?.email}</p>
              </div>

              {/* Rejection Reason */}
              {listing.rejection_reason && (
                <>
                  <Separator />
                  <div className="p-3 bg-destructive/10 rounded">
                    <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                    <p className="text-sm text-muted-foreground">{listing.rejection_reason}</p>
                  </div>
                </>
              )}

              {/* Actions */}
              <Separator />
              {showRejectForm ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">Rejection Reason *</Label>
                    <Textarea
                      id="reason"
                      placeholder="e.g., Images are unclear, missing required amenities, incorrect pricing..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowRejectForm(false)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        "Confirm Rejection"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {listing.status !== "approved" && (
                    <Button onClick={handleApprove} disabled={actionLoading}>
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Listing
                        </>
                      )}
                    </Button>
                  )}
                  {listing.status !== "rejected" && (
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectForm(true)}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Listing
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
