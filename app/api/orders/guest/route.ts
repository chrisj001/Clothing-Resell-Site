import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '../../../../lib/supabase-server'
import { apiRateLimit, getClientIp } from '../../../../lib/rate-limit'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// ── Strict UUID v4 regex ────────────────────────────────────────────────────
// Matches only canonical UUIDv4 strings (version bit = 4, variant bits = 8,9,a,b).
// Rejects: empty strings, SQL injection payloads, non-v4 UUIDs, truncated tokens.
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// ── Lazy-initialised admin client ───────────────────────────────────────────
// The service-role client bypasses RLS so we can apply the guest_token filter
// entirely in application code (server-side), keeping the comparison secret
// from the client while still enforcing the "user_id IS NULL" invariant.
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    )
  }

  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: Request): Promise<NextResponse> {
  // ── Step 1: Rate-limit before any DB work ──────────────────────────────
  // Prevents brute-force enumeration of guest tokens even though UUIDs have
  // 122 bits of entropy. Aligns with the API_SECURITY_CONTRACT.md pattern.
  const ip = getClientIp(request)
  const { success } = await apiRateLimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // ── Step 2: Extract and validate the guest_token ───────────────────────
  const { searchParams } = new URL(request.url)
  const rawToken = searchParams.get('guest_token')

  if (!rawToken || !UUID_V4_REGEX.test(rawToken)) {
    // Return 400 with a vague message — do not reveal what format is expected
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // ── Step 3: Reject authenticated users ────────────────────────────────
  // Authenticated users have their orders linked via user_id and should use
  // the standard /api/orders endpoint (which reads from the JWT, not a token).
  // Allowing authenticated users here would be a confusing API surface.
  let supabase: Awaited<ReturnType<typeof createServerClient>>
  try {
    supabase = await createServerClient()
  } catch (err) {
    console.error('[guest-order] Failed to create server client:', err)
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return NextResponse.json(
      { error: 'Authenticated users should use /api/orders' },
      { status: 400 }
    )
  }

  // ── Step 4: Look up the guest order with a server-side filter ──────────
  // We use the admin (service-role) client here because:
  //   a. RLS on the `orders` table is enabled, and the anon key only grants
  //      access via Policy B which requires a custom header we cannot set
  //      reliably from a Next.js API route.
  //   b. The service-role client bypasses RLS entirely — the filter below
  //      re-implements Policy B exactly, enforced in trusted server code.
  //
  // Filter mirrors SQL Policy B:
  //   user_id IS NULL  → guest checkout order only (never linked to an account)
  //   guest_token = ?  → caller must know the exact UUID secret
  let supabaseAdmin: ReturnType<typeof getAdminClient>
  try {
    supabaseAdmin = getAdminClient()
  } catch (err) {
    console.error('[guest-order] Admin client init error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }

  const { data: order, error: dbError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .is('customer_id', null)           // Policy B condition a: guest order only
    .eq('guest_token', rawToken)        // Policy B condition c: token must match
    .maybeSingle()                      // Returns null (not an error) if no row found

  if (dbError) {
    console.error('[guest-order] DB error:', dbError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (!order) {
    // ── Oracle-attack prevention ─────────────────────────────────────────
    // Return an identical 404 for both "order doesn't exist" and "wrong token".
    // A 403 would reveal that the order exists but the token is wrong, which
    // would allow an attacker to confirm order IDs before brute-forcing tokens.
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ order }, { status: 200 })
}
