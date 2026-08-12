-- ============================================================
-- Migration 007: Atomic discount code usage increment
-- ============================================================
-- Problem:
--   The previous pattern read current_uses, checked against max_uses, then
--   wrote current_uses + 1 in two separate queries. Under concurrent load,
--   two checkouts could both pass the limit check before either incremented,
--   allowing a code to be used more times than max_uses allows.
--
-- Fix:
--   A single atomic UPDATE with the limit check in the WHERE clause.
--   PostgreSQL's row-level locking means only one UPDATE wins per row.
--   The function returns TRUE if the row was updated, FALSE if the limit
--   was already reached (or the code was deactivated between check and use).
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_discount_uses(p_discount_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_rows int;
BEGIN
  UPDATE public.discount_codes
  SET current_uses = current_uses + 1
  WHERE id = p_discount_id
    AND is_active = true
    AND (max_uses IS NULL OR current_uses < max_uses);

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;
