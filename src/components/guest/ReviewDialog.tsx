import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDemoData } from "@/hooks/useDemoData";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  listingTitle: string;
  existingReview?: {
    id: string;
    rating: number;
    text: string;
    created_at: string;
  } | null;
  onReviewSubmitted: () => void;
}

export const ReviewDialog = ({
  open,
  onOpenChange,
  bookingId,
  listingTitle,
  existingReview,
  onReviewSubmitted,
}: ReviewDialogProps) => {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { isDemoMode, getBooking, addReview, updateReview } = useDemoData();

  const canEdit = existingReview
    ? new Date().getTime() - new Date(existingReview.created_at).getTime() <
      2 * 24 * 60 * 60 * 1000
    : true;

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.text || "");
    } else {
      setRating(5);
      setReviewText("");
    }
  }, [existingReview, open]);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast({
        title: "Invalid rating",
        description: "Please select a rating between 1 and 5 stars",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (isDemoMode) {
        // Demo mode: use localStorage
        if (existingReview) {
          // Update existing review
          const updated = updateReview(existingReview.id, {
            rating,
            text: reviewText,
          });
          
          if (!updated) throw new Error("Failed to update review");
          
          toast({
            title: "Review updated",
            description: "Your review has been updated successfully",
          });
        } else {
          // Create new review - need listing_id from booking
          const booking = getBooking(bookingId);
          
          if (!booking) throw new Error("Booking not found");
          
          const newReview = addReview({
            booking_id: bookingId,
            listing_id: booking.listing_id,
            rating,
            text: reviewText,
          });
          
          if (!newReview) throw new Error("Failed to create review");
          
          toast({
            title: "Review submitted",
            description: "Your review has been submitted for approval",
          });
        }
      } else {
        // Real mode: use Supabase
        if (existingReview) {
          // Update existing review
          const { error } = await supabase
            .from("reviews")
            .update({
              rating,
              text: reviewText,
            })
            .eq("id", existingReview.id);

          if (error) throw error;

          toast({
            title: "Review updated",
            description: "Your review has been updated successfully",
          });
        } else {
          // Create new review - fetch listing_id from booking first
          const { data: booking } = await supabase
            .from("bookings")
            .select("listing_id")
            .eq("id", bookingId)
            .single();

          if (!booking) throw new Error("Booking not found");

          const { error } = await supabase.from("reviews").insert({
            booking_id: bookingId,
            listing_id: booking.listing_id,
            author_user_id: (await supabase.auth.getUser()).data.user?.id,
            rating,
            text: reviewText,
            status: "pending",
          });

          if (error) throw error;

          toast({
            title: "Review submitted",
            description: "Your review has been submitted for approval",
          });
        }
      }

      onReviewSubmitted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? "Edit Your Review" : "Leave Review"}
          </DialogTitle>
          <DialogDescription>
            {existingReview ? (
              <>
                Update your review for {listingTitle}
                {!canEdit && (
                  <span className="block mt-2 text-destructive">
                    Reviews can only be edited within 2 days of posting
                  </span>
                )}
              </>
            ) : (
              `Thank you for staying at ${listingTitle}. Your feedback helps hosts improve and future guests choose confidently.`
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Overall Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Your Review (Optional)
            </label>
            <Textarea
              placeholder="Share what you liked, what could be better, and any details future guests should know."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              disabled={!canEdit}
              rows={5}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reviewText.length}/1000 characters
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !canEdit}>
            {submitting
              ? "Submitting..."
              : existingReview
              ? "Update Review"
              : "Post Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
