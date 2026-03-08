import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState, useRef, useEffect } from "react";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    text: string | null;
    created_at: string;
    host_response?: string | null;
    host_response_at?: string | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    } | null;
  };
  truncated?: boolean;
  onShowMore?: (reviewId: string) => void;
  highlightId?: string;
}

export const ReviewCard = ({ review, truncated = true, onShowMore, highlightId }: ReviewCardProps) => {
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const firstName = review.profiles?.first_name || "Anonymous";
  const lastName = review.profiles?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  const reviewDate = format(new Date(review.created_at), "MMMM yyyy");
  const isHighlighted = highlightId === review.id;

  useEffect(() => {
    if (truncated && textRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * 3;
      setIsTextTruncated(textRef.current.scrollHeight > maxHeight);
    }
  }, [truncated, review.text]);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={cardRef}
      className={`rounded-lg p-4 border transition-all duration-300 ${
        isHighlighted ? "border-2 border-primary bg-accent/10" : "border-transparent"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-[26px] w-[26px]">
          <AvatarImage src={review.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <p className="font-semibold text-foreground">{fullName}</p>
        <span className="text-muted-foreground">•</span>
        <Badge variant="secondary" className="px-2 py-0.5 text-sm border-0">
          {review.rating.toFixed(1)}
        </Badge>
        <p className="text-sm text-muted-foreground">{reviewDate}</p>
      </div>

      {review.text && (
        <div>
          <p
            ref={textRef}
            className={`text-foreground leading-relaxed ${
              truncated ? "line-clamp-3" : ""
            }`}
          >
            {review.text}
          </p>
          {truncated && isTextTruncated && onShowMore && (
            <button
              onClick={() => onShowMore(review.id)}
              className="text-primary text-sm font-medium mt-2 hover:underline"
            >
              Show more
            </button>
          )}
        </div>
      )}

      {review.host_response && (
        <div className="mt-3 bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Réponse de l'hôte</p>
          <p className="text-sm text-foreground">{review.host_response}</p>
        </div>
      )}
    </div>
  );
};
