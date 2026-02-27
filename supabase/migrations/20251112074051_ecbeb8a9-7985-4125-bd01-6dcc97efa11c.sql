-- Delete all booking-related data
-- Order matters: delete child records first, then parent bookings

-- First, remove FK references in guest_debts to transactions
UPDATE public.guest_debts SET payment_transaction_id = NULL WHERE payment_transaction_id IS NOT NULL;

-- Delete transactions
DELETE FROM public.transactions;

-- Delete payouts
DELETE FROM public.payouts;

-- Delete guest debts
DELETE FROM public.guest_debts;

-- Delete disputes
DELETE FROM public.disputes;

-- Delete reviews
DELETE FROM public.reviews;

-- Delete messages that reference bookings (optional FK)
UPDATE public.messages SET booking_id = NULL WHERE booking_id IS NOT NULL;

-- Delete message threads that reference bookings (optional FK)
UPDATE public.message_threads SET booking_id = NULL WHERE booking_id IS NOT NULL;

-- Finally, delete all bookings
DELETE FROM public.bookings;