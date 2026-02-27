import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Loader2 } from "lucide-react";
import { BookingCard } from "@/components/shared/BookingCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDemoData } from "@/hooks/useDemoData";

interface ReviewDetailDialogProps {
  review: {
    id: string;
    booking_id: string;
    author_user_id: string;
    rating: number;
    text: string;
    status: string;
    created_at: string;
    guest_name: string;
    guest_email: string;
    guest_avatar: string;
    listing_id: string;
    listing_title: string;
    listing_city: string;
    listing_country: string;
    booking_checkin: string;
    booking_checkout: string;
    booking_status: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: () => void;
}

export const ReviewDetailDialog = ({
  review,
  open,
  onOpenChange,
  onStatusUpdated,
}: ReviewDetailDialogProps) => {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const { isDemoMode, updateAdminReviewStatus } = useDemoData();

  if (!review) return null;

  const updateStatus = async (newStatus: "approved" | "rejected" | "blocked" | "pending") => {
    setUpdating(true);
    
    if (isDemoMode) {
      const success = updateAdminReviewStatus(review.id, newStatus);
      if (success) {
        toast({
          title: "Success",
          description: `Review ${newStatus} successfully`,
        });
        onStatusUpdated();
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to update review status",
          variant: "destructive",
        });
      }
      setUpdating(false);
      return;
    }
    
    const { error } = await supabase
      .from("reviews")
      .update({ status: newStatus })
      .eq("id", review.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Review ${newStatus} successfully`,
      });
      onStatusUpdated();
      onOpenChange(false);
    }
    setUpdating(false);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Mock booking data for BookingCard (we don't have full booking details)
  const bookingData = {
    id: review.booking_id,
    checkin_date: review.booking_checkin,
    checkout_date: review.booking_checkout,
    nights: 0, // We don't have this data
    guests: 0, // We don't have this data
    total_price: 0, // We don't have this data
    status: review.booking_status,
    listing_title: review.listing_title,
    listing_city: review.listing_city,
    listing_country: review.listing_country,
    listing_cover_image: "", // We don't have this data
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <div>
            <p className="text-muted-foreground mb-3">Booking Information</p>
            <BookingCard booking={bookingData} showBadge={true} />
          </div>

          {/* Review Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Review</h3>

              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={review.guest_avatar} alt={review.guest_name} />
                  <AvatarFallback>{getInitials(review.guest_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-semibold">{review.guest_name}</p>
                      <p className="text-sm text-muted-foreground">{review.guest_email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                      <span className="ml-2 font-semibold">{review.rating}/5</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Submitted on {format(new Date(review.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                  </p>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground whitespace-pre-wrap">{review.text || "No review text provided"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {review.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => updateStatus("rejected")}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Decline"
                  )}
                </Button>
                <Button onClick={() => updateStatus("approved")} disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Approve"
                  )}
                </Button>
              </>
            )}
            {review.status === "approved" && (
              <Button
                variant="destructive"
                onClick={() => updateStatus("blocked")}
                disabled={updating}
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Block"
                )}
              </Button>
            )}
            {(review.status === "rejected" || review.status === "blocked") && (
              <Button onClick={() => updateStatus("approved")} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Approve"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
