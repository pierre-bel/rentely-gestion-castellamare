-- Delete all bookings and related data (correct order for foreign keys)

-- Delete reviews (depend on bookings)
DELETE FROM public.reviews;

-- Delete guest debts FIRST (has FK to transactions.payment_transaction_id)
DELETE FROM public.guest_debts;

-- Delete transactions (depend on bookings)
DELETE FROM public.transactions;

-- Delete payouts (depend on bookings)
DELETE FROM public.payouts;

-- Delete disputes (depend on bookings)
DELETE FROM public.disputes;

-- Delete message_threads that reference bookings
DELETE FROM public.message_threads WHERE booking_id IS NOT NULL;

-- Delete bookings
DELETE FROM public.bookings;