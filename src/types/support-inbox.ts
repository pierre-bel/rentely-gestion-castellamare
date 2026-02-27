export interface SupportThread {
  thread_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  last_message: string | null;
  last_message_time: string;
  unread_count: number;
  is_locked?: boolean;
  locked_at?: string;
  locked_reason?: string;
}

export const SUPPORT_USER_ID = '00000000-0000-0000-0000-000000000001';
