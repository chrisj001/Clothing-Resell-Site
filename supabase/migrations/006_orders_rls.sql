-- ============================================================
-- Migration 006: Enable RLS on orders + guest checkout token
-- ============================================================
-- Context:
--   The `orders` table already exists with a `customer_id` UUID column
--   (references auth.users). There is no guest_token column yet.
--   This migration:
--     1. Adds the `guest_token` UUID column (safe, idempotent)
--     2. Enables Row Level Security (RLS)
--     3. Creates Policy A — authenticated users see only their own orders
--     4. Creates Policy B — anonymous guests see their order via a secret token
--
-- SECURITY INVARIANT:
--   guest_token is generated server-side via gen_random_uuid() at order
--   creation. It must NEVER be accepted from the client at INSERT time.
--   With 122 bits of entropy a brute-force attack is computationally infeasible.
-- ============================================================


-- ── 1. Add the guest_token column (idempotent) ──────────────────────────────
--
-- The orders table already has customer_id (FK to auth.users).
-- For authenticated orders, customer_id is set and guest_token is NULL.
-- For guest checkout orders, customer_id is NULL and guest_token is the
-- lookup secret returned to the guest after payment.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_token UUID DEFAULT NULL;

-- Index for the guest token lookup performed by the /api/orders/guest route.
-- Partial index (WHERE guest_token IS NOT NULL) keeps it small and fast.
CREATE INDEX IF NOT EXISTS orders_guest_token_idx
  ON public.orders (guest_token)
  WHERE guest_token IS NOT NULL;


-- ── 2. Enable Row Level Security ────────────────────────────────────────────
--
-- After this statement, NO rows are visible to any role by default.
-- Visibility is granted exclusively by the policies below.
-- The service-role key bypasses RLS entirely (used server-side in API routes).
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;


-- ── 3. Policy A — Authenticated users see only their own orders ─────────────
--
-- auth.uid() returns the UUID from the verified JWT.
-- For anonymous/guest requests auth.uid() returns NULL, so this policy
-- naturally excludes them without any extra condition needed.
--
-- Applied to: any session with the `authenticated` Supabase role.
DROP POLICY IF EXISTS "orders_select_authenticated" ON public.orders;
CREATE POLICY "orders_select_authenticated"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());


-- ── 4. Policy B — Anonymous guests see their order via a secret token ───────
--
-- Applied to: sessions with the `anon` Supabase role (no logged-in user).
--
-- ALL three conditions must be true for a row to be visible:
--   a. customer_id IS NULL → the row is a guest checkout order (not linked
--                            to an account), preventing guests from seeing
--                            orders that belong to registered users.
--   b. guest_token IS NOT NULL → defensive guard; rows without a token are
--                            never accessible via this policy.
--   c. guest_token = ...   → the caller must supply the exact UUID secret that
--                            was stored at checkout time.
--
-- NOTE: In production, the guest_token comparison is enforced server-side in
-- the /api/orders/guest API route (which uses the service-role key and applies
-- the same filter explicitly). This policy acts as a defence-in-depth layer
-- so that even a direct PostgREST call cannot circumvent the restriction.
DROP POLICY IF EXISTS "orders_select_guest" ON public.orders;
CREATE POLICY "orders_select_guest"
  ON public.orders
  FOR SELECT
  TO anon
  USING (
    customer_id IS NULL
    AND guest_token IS NOT NULL
    AND guest_token = (
      -- PostgREST exposes query parameters via request.headers when using
      -- custom claims. For direct Supabase JS client calls from the API route,
      -- the filter is applied in application code (see /api/orders/guest/route.ts).
      -- This expression handles direct PostgREST access as a second layer.
      nullif(current_setting('request.headers', true)::json->>'x-guest-token', '')::uuid
    )
  );
