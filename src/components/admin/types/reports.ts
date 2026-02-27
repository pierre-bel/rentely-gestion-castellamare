export interface WeeklyRevenueReport {
  week_start: string;
  week_end: string;
  week_label: string;
  bookings_count: number;
  gross_revenue: number;
  refunds_amount: number;
  host_payouts_amount: number;
  net_revenue: number;
}

export interface DetailedRevenueReport {
  booking_id: string;
  booking_display_id: string;
  guest_user_id: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  created_at: string;
  listing_title: string;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
  status: string;
  refunds_amount: number;
  host_payouts_amount: number;
  net_revenue: number;
}

export interface RevenueReportFilters {
  startDate: Date;
  endDate: Date;
}
