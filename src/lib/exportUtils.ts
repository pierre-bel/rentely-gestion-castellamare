import { supabase } from "@/integrations/supabase/client";
import type { DetailedRevenueReport } from "@/components/admin/types/reports";

/**
 * Format a number as currency with proper formatting
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a date string to YYYY-MM-DD HH:mm:ss with AM/PM
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${year}-${month}-${day} ${displayHours}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Convert 24-hour time to 12-hour AM/PM format
 */
export const format24to12Hour = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return time24;
  
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

/**
 * Convert 12-hour AM/PM time to 24-hour format
 */
export const format12to24Hour = (time12: string): string => {
  if (!time12 || !time12.includes(':')) return time12;
  
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time12;
  
  let [, hours, minutes, period] = match;
  let hour24 = parseInt(hours);
  
  if (period.toUpperCase() === 'PM' && hour24 !== 12) {
    hour24 += 12;
  } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
    hour24 = 0;
  }
  
  return `${String(hour24).padStart(2, '0')}:${minutes}`;
};

/**
 * Format a date string to YYYY-MM-DD
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toISOString().substring(0, 10);
};

/**
 * Format a number without currency symbol (just numeric value with 2 decimals)
 */
export const formatNumeric = (amount: number): string => {
  return amount.toFixed(2);
};

/**
 * Escape CSV field values that contain special characters
 */
const escapeCsvField = (value: string | number | null): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the field contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

/**
 * Convert booking data to CSV format
 */
export const formatBookingDataToCSV = (bookings: DetailedRevenueReport[]): string => {
  // CSV Header
  const header = [
    'Currency',
    'Booking ID',
    'Guest Id',
    'Guest name',
    'Created at',
    'Listing Name',
    'Check-in Date',
    'Check-out Date',
    'Gross Revenue',
    'Status',
    'Refunds',
    'Host Payouts',
    'Net Revenue'
  ].join(',');

  // CSV Rows
  const rows = bookings.map(booking => {
    const guestName = booking.guest_first_name && booking.guest_last_name
      ? `${booking.guest_first_name} ${booking.guest_last_name}`
      : 'N/A';

    return [
      escapeCsvField('USD'),
      escapeCsvField(booking.booking_display_id),
      escapeCsvField(booking.guest_user_id),
      escapeCsvField(guestName),
      escapeCsvField(formatDateTime(booking.created_at)),
      escapeCsvField(booking.listing_title),
      escapeCsvField(formatDate(booking.checkin_date)),
      escapeCsvField(formatDate(booking.checkout_date)),
      escapeCsvField(formatNumeric(booking.total_price)),
      escapeCsvField(booking.status),
      escapeCsvField(formatNumeric(booking.refunds_amount)),
      escapeCsvField(formatNumeric(booking.host_payouts_amount)),
      escapeCsvField(formatNumeric(booking.net_revenue))
    ].join(',');
  });

  return [header, ...rows].join('\n');
};

/**
 * Trigger browser download of CSV file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Export bookings to CSV for a given date range
 */
export const exportBookingsToCSV = async (
  startDate: string,
  endDate: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('admin_get_detailed_revenue_report', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Error fetching revenue report:', error);
      
      if (error.message?.includes('permission')) {
        return { success: false, error: "You don't have permission to export reports" };
      }
      
      return { success: false, error: 'Failed to fetch report data' };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'No bookings found for selected period' };
    }

    // Format data to CSV
    const csvContent = formatBookingDataToCSV(data);
    
    // Generate filename
    const filename = `revenue-report-${startDate}-to-${endDate}.csv`;
    
    // Trigger download
    downloadCSV(csvContent, filename);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};
