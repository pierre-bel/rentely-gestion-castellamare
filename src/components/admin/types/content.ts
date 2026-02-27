export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface FAQFormData {
  question: string;
  answer: string;
  category: string;
  status: 'draft' | 'published';
}

export const FAQ_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'cancellation', label: 'Cancellation' },
  { value: 'account', label: 'Account' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'support', label: 'Support' },
] as const;

export const FAQ_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
] as const;
