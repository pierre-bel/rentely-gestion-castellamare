import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReviewCard } from "./ReviewCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Star } from "lucide-react";

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

interface AllReviewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
  scrollToReviewId?: string;
}

export const AllReviewsDialog = ({
  open,
  onOpenChange,
  reviews,
  averageRating,
  reviewCount,
  scrollToReviewId,
}: AllReviewsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle className="sr-only">Reviews</DialogTitle>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">Reviews</h2>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-primary text-primary" />
              <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>
        </DialogHeader>
        
        <Separator className="flex-shrink-0 my-0" />

        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          <div className="space-y-8 pt-6 pb-6">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                truncated={false}
                highlightId={scrollToReviewId}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
