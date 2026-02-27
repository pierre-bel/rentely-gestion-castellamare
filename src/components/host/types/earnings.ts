export interface HostEarningsReport {
  listing_id: string;
  listing_title: string;
  month_year: string;
  month_date: string;
  nights_booked: number;
  completed_count: number;
  cancel_percentage: number;
  occupancy_percentage: number;
  average_nightly_rate: number;
  gross_earnings: number;
  platform_fees: number;
  net_earnings: number;
  last_payout_date: string | null;
  cancellation_income: number;
  dispute_refunds: number;
  dispute_income: number;
  actual_net_earnings: number;
}
