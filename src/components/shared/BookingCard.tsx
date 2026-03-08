import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

interface BookingCardProps {
  booking: {
    id: string;
    checkin_date: string;
    checkout_date: string;
    nights: number;
    guests: number;
    total_price: number;
    status: string;
    listings?: {
      id: string;
      title: string;
      city: string;
      country: string;
      cover_image: string;
    };
    listing_title?: string;
    listing_city?: string;
    listing_country?: string;
    listing_cover_image?: string;
  };
  actions?: ReactNode;
  showBadge?: boolean;
  variant?: 'default' | 'past';
  hasReview?: boolean;
  onReviewAction?: () => void;
}


export const BookingCard = ({ 
  booking, 
  actions, 
  showBadge = true,
  variant = 'default',
  hasReview,
  onReviewAction
}: BookingCardProps) => {
  const title = booking.listings?.title || booking.listing_title || "Unknown Listing";
  const city = booking.listings?.city || booking.listing_city || "";
  const country = booking.listings?.country || booking.listing_country || "";
  const coverImage = booking.listings?.cover_image || booking.listing_cover_image || "";

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {coverImage && (
            <div className="h-32 w-32 rounded-lg overflow-hidden flex-shrink-0">
              <img src={coverImage} alt={title} className="h-full w-full object-cover" />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg mb-1">{title}</h3>
                {(city || country) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {city}
                      {city && country && ", "}
                      {country}
                    </span>
                  </div>
                )}
              </div>
              {showBadge && (
                <StatusBadge status={booking.status as any} />
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  <span>Check-in</span>
                </div>
                <p className="font-medium">
                  {format(new Date(booking.checkin_date), "MMM dd, yyyy")}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  <span>Check-out</span>
                </div>
                <p className="font-medium">
                  {format(new Date(booking.checkout_date), "MMM dd, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Total</p>
                <p className="font-semibold text-lg">${booking.total_price.toFixed(2)}</p>
              </div>
            </div>

            {variant === 'past' && onReviewAction ? (
              <div className="flex gap-2 mt-4">
                <Button
                  variant={hasReview ? "outline" : "default"}
                  onClick={onReviewAction}
                  className="w-full sm:w-auto"
                >
                  {hasReview ? "View Review" : "Leave Review"}
                </Button>
              </div>
            ) : actions ? (
              <div className="flex gap-2 mt-4">{actions}</div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
