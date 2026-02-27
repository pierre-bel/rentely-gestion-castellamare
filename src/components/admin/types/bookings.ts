export interface AdminBooking {
  id: string;
  booking_display_id: string;
  listing_id: string;
  listing_title: string;
  listing_city: string;
  listing_country: string;
  host_user_id: string;
  host_name: string;
  host_email: string;
  host_avatar: string | null;
  guest_user_id: string;
  guest_name: string;
  guest_email: string;
  guest_avatar: string | null;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  guests: number;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
}
