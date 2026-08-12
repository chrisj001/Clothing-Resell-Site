-- ============================================================
-- Migration 008: Checkout item cache table
-- ============================================================
-- Problem:
--   Stripe metadata values are capped at 500 characters per key.
--   Carts with many items silently truncated to the string 'too_large',
--   causing the Stripe webhook to skip inventory updates, mark nothing
--   as sold, and record orders with an empty items array.
--
-- Fix:
--   Store the full items array in this table before creating the Stripe
--   session or PaymentIntent. Pass the row UUID as `items_cache_id` in
--   Stripe metadata. The webhook reads from here, then deletes the row.
--
-- TTL:
--   Rows are auto-expired after 48 hours via the created_at index.
--   A cleanup job (or periodic SQL) can purge stale rows:
--     DELETE FROM checkout_item_cache WHERE created_at < now() - interval '48 hours';
-- ============================================================

CREATE TABLE IF NOT EXISTS public.checkout_item_cache (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  items       jsonb       NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Index for TTL cleanup queries
CREATE INDEX IF NOT EXISTS checkout_item_cache_created_at_idx
  ON public.checkout_item_cache (created_at);

-- Enable RLS with no policies = only the service-role key can read/write.
-- The anon and authenticated roles have zero access.
ALTER TABLE public.checkout_item_cache ENABLE ROW LEVEL SECURITY;
