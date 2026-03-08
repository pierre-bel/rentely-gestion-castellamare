
-- Grant anon access to the cleaning portal function
GRANT EXECUTE ON FUNCTION public.get_cleaning_portal_data(TEXT, DATE, DATE) TO anon;
