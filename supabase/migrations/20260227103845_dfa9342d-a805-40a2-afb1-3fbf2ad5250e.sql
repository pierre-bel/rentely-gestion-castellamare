
-- Create a trigger to automatically assign 'host' role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_host_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert host role for every new user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'host')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Also create a profile
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created_host ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_host
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_host_role();
