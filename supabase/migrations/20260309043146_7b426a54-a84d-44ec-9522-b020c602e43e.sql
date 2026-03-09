-- Add new booking status values for blocked calendar and pre-reservations
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'owner_blocked';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'pre_reservation';