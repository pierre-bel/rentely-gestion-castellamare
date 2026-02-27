export interface MessageThread {
  thread_id: string;
  other_user_id: string;
  other_user_name: string;
  listing_title: string;
  listing_address: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  booking_id: string | null;
  is_locked?: boolean;
  locked_at?: string;
  locked_reason?: string;
}

export interface Message {
  id: string;
  thread_id: string;
  from_user_id: string;
  to_user_id: string;
  body: string;
  attachment_url: string | null;
  attachment_type: string | null;
  read: boolean;
  created_at: string;
}

export interface BookingDetails {
  address: string;
  checkin_date: string;
  checkin_time: string;
  checkout_date: string;
  checkout_time: string;
  guests: number;
  status: string;
  booking_id: string;
  receipt_email: string;
}
