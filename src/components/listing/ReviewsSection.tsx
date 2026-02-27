import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReviewCard } from "./ReviewCard";
import { AllReviewsDialog } from "./AllReviewsDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewsSectionProps {
  listingId: string;
  averageRating: number;
  reviewCount: number;
}

interface Review {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const ReviewsSection = ({ listingId, averageRating, reviewCount }: ReviewsSectionProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scrollToReviewId, setScrollToReviewId] = useState<string | undefined>();

  useEffect(() => {
    fetchReviews();
  }, [listingId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          text,
          created_at,
          author_user_id,
          listing_id
        `)
        .eq("listing_id", listingId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately for all reviews
      const authorIds = data?.map(r => r.author_user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from("public_profiles")
        .select("id, first_name, last_name, avatar_url")
        .in("id", authorIds);

      // Map profiles to reviews
      const reviewsWithProfiles = data?.map(review => ({
        ...review,
        profiles: profilesData?.find(p => p.id === review.author_user_id) || null
      })) || [];

      setReviews(reviewsWithProfiles);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowMore = (reviewId: string) => {
    setScrollToReviewId(reviewId);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setScrollToReviewId(undefined);
  };

  if (loading) {
    return (
      <div className="bg-[#F8FAFF] rounded-xl p-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-[#F8FAFF] rounded-xl p-8">
        <h2 className="text-2xl font-medium mb-4">Reviews</h2>
        <p className="text-muted-foreground">No reviews yet. Be the first to leave a review!</p>
      </div>
    );
  }

  const displayedReviews = reviews.slice(0, 6);
  const hasMoreReviews = reviews.length > 6;

  return (
    <>
      <div className="bg-[#F8FAFF] rounded-xl p-8">
        <h2 className="text-2xl font-medium mb-6">Reviews</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {displayedReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              truncated={true}
              onShowMore={handleShowMore}
            />
          ))}
        </div>
        {hasMoreReviews && (
          <div className="flex justify-center">
            <button
              onClick={() => setDialogOpen(true)}
              className="min-h-[40px] text-2xl font-display font-medium underline bg-transparent border-none cursor-pointer p-0"
            >
              See more reviews
            </button>
          </div>
        )}
      </div>

      <AllReviewsDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        reviews={reviews}
        averageRating={averageRating}
        reviewCount={reviewCount}
        scrollToReviewId={scrollToReviewId}
      />
    </>
  );
};
