CREATE OR REPLACE FUNCTION public.increment_loyalty_points(
  target_user_id UUID,
  points_to_add INT,
  points_to_deduct INT DEFAULT 0
)
RETURNS TABLE (
  new_loyalty_points INT,
  new_lifetime_points INT,
  new_tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_loyalty INT;
  v_lifetime INT;
  v_tier TEXT;
BEGIN
  UPDATE public.profiles
  SET 
    loyalty_points = GREATEST(0, loyalty_points + points_to_add - points_to_deduct),
    lifetime_points = lifetime_points + points_to_add
  WHERE id = target_user_id
  RETURNING 
    profiles.loyalty_points,
    profiles.lifetime_points
  INTO v_loyalty, v_lifetime;

  IF v_lifetime >= 5000 THEN
    v_tier := 'Gold';
  ELSIF v_lifetime >= 1000 THEN
    v_tier := 'Silver';
  ELSE
    v_tier := 'Bronze';
  END IF;

  UPDATE public.profiles
  SET tier = v_tier
  WHERE id = target_user_id;

  RETURN QUERY SELECT v_loyalty, v_lifetime, v_tier;
END;
$func$;
