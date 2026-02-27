export interface Transaction {
  id: string;
  booking_id: string;
  type: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  created_at: string;
  guest_user_id: string;
  guest_name: string;
  guest_email: string;
  guest_avatar: string;
  listing_id: string;
  listing_title: string;
}

export interface Payout {
  // Payout info
  id: string;
  booking_id: string;
  host_user_id: string;
  amount: number;
  currency: string;
  status: string;
  payout_date: string | null;
  created_at: string;
  notes: string | null;
  
  // Financial breakdown (nullable for debt records)
  booking_subtotal: number | null;
  booking_host_commission_amount: number | null;
  booking_host_payout_net: number | null;
  booking_host_payout_gross: number | null;
  
  // Booking dates (nullable for debt records)
  checkin_date: string | null;
  checkout_date: string | null;
  
  // Listing
  listing_id: string | null;
  listing_title: string;
  
  // Guest
  guest_name: string;
  guest_email: string;
  guest_avatar: string;
  
  // Host
  host_name: string;
  host_email: string;
  host_avatar: string;
  
  // Enhanced fields for better UX
  booking_status: string | null;
  transaction_type: 'regular_earning' | 'debt_collection' | 'refund_debt' | 'cancelled' | 'booking_payout' | 'refund';
  dispute_category: string | null;
  guest_debt_status: string | null;
  refund_amount: number | null;
  cancellation_date: string | null;
  
  // Enhanced financial tracking
  original_amount: number | null;
  cleaning_fee: number | null;
  
  // Array-based dispute tracking (supports multiple disputes per payout)
  dispute_ids: string[] | null;
  total_dispute_refunds: number | null;
  
  // Pre-calculated financial breakdown
  refund_percentage_applied: number | null;
  host_retained_gross: number | null;
  commission_on_retained: number | null;
  guest_total_payment: number | null;
  base_subtotal: number | null;
  base_cleaning_fee: number | null;
  gross_revenue: number | null;
  commission_amount: number | null;
  net_before_adjustments: number | null;
}

export interface GuestDebt {
  id: string;
  guest_user_id: string;
  guest_name: string;
  guest_email: string;
  guest_avatar: string;
  dispute_id: string;
  dispute_display_id: string;
  booking_id: string;
  booking_display_id: string;
  listing_title: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  created_at: string;
  paid_at: string | null;
  expires_at: string | null;
  notes: string | null;
}
