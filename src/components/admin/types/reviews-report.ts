export interface ListingReviewsReport {
  listing_id: string;
  listing_title: string;
  listing_city: string;
  total_reviews: number;
  average_rating: number;
  last_review_date: string;
}

export interface ReviewsReportFilters {
  startDate: Date;
  endDate: Date;
  minRating: number | null;
}

export interface CustomReportFilters {
  startDate: Date;
  endDate: Date;
  cityIds: string[];
  ratingThresholds: number[];
}

export interface CityOption {
  id: string;
  name: string;
  country_name: string;
}

export interface DetailedReviewExport {
  listing_id: string;
  listing_name: string;
  city_name: string;
  country_name: string;
  user_full_name: string;
  review_text: string;
  rating: number;
  review_created_at: string;
}
