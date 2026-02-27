export interface AdminDispute {
  id: string;
  dispute_display_id: string;
  booking_id: string;
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
  category: string;
  status: string;
  subject: string;
  description: string;
  requested_refund_amount: number | null;
  support_thread_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}
