-- 1. Create a security trigger function to protect sensitive columns
CREATE OR REPLACE FUNCTION public.protect_secure_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  jwt_role text;
BEGIN
  -- Get the role using Supabase's built-in auth.role() function
  -- This correctly returns 'service_role' when using the service key
  jwt_role := auth.role();
  
  -- If this is the backend server using the secure service key, allow it
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Otherwise, check if the currently logged-in user is an admin
  SELECT (role = 'admin') INTO is_admin FROM public.profiles WHERE id = auth.uid();
  
  -- If they are NOT an admin, prevent tampering with sensitive data!
  IF NOT COALESCE(is_admin, false) THEN
    -- Force the sensitive columns to remain exactly as they were
    NEW.role := OLD.role;
    NEW.tier := OLD.tier;
    NEW.loyalty_points := OLD.loyalty_points;
    NEW.lifetime_points := OLD.lifetime_points;
    NEW.birthday := OLD.birthday;
    NEW.full_name := OLD.full_name;
  END IF;

  RETURN NEW;
END;
$$;
