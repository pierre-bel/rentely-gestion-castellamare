-- Harden function by fixing mutable search_path
ALTER FUNCTION public.admin_get_dispute_details(uuid)
  SET search_path = public;