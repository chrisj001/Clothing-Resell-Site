/**
 * scripts/set-admin-role.ts
 *
 * Promotes a Supabase user to admin by setting app_metadata.role = 'admin'
 * via the Supabase Admin API (service-role key).
 *
 * WHY app_metadata (not profiles.role)?
 *   - app_metadata is embedded in the cryptographically signed JWT
 *   - It can only be written by the service-role key — never by the user
 *   - The proxy.ts file reads it with zero DB queries on every admin request
 *   - Existing profiles.role values remain unchanged (source of truth moves here)
 *
 * SAFETY:
 *   - updateUser is idempotent — running this twice on the same user is safe
 *   - app_metadata is a merge, not a replace: other fields are preserved
 *   - The user must sign out and back in (or wait for token refresh, ≤1h) to
 *     pick up the new role in their JWT
 *
 * USAGE:
 *   npx tsx scripts/set-admin-role.ts <user-uuid>
 *
 * EXAMPLE:
 *   npx tsx scripts/set-admin-role.ts 123e4567-e89b-12d3-a456-426614174000
 *
 * PREREQUISITES:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in
 *   your environment (e.g. sourced from .env.local).
 */

import { createClient } from '@supabase/supabase-js'

// ── UUID validation (any version) ────────────────────────────────────────────
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Validate environment variables before doing anything ─────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL is not set.')
  process.exit(1)
}
if (!serviceRoleKey) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY is not set.')
  console.error(
    '   Tip: Run with `dotenv -e .env.local -- npx tsx scripts/set-admin-role.ts <uuid>`'
  )
  process.exit(1)
}

// ── Validate the user UUID argument ─────────────────────────────────────────
const userId = process.argv[2]

if (!userId) {
  console.error('❌  No user UUID provided.')
  console.error('   Usage: npx tsx scripts/set-admin-role.ts <user-uuid>')
  process.exit(1)
}

if (!UUID_REGEX.test(userId)) {
  console.error(`❌  "${userId}" is not a valid UUID.`)
  console.error('   Obtain the user UUID from the Supabase Auth dashboard.')
  process.exit(1)
}

// ── Initialise the admin client ───────────────────────────────────────────────
// autoRefreshToken and persistSession are disabled — this is a one-shot CLI
// script, not a long-lived server process.
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Main ─────────────────────────────────────────────────────────────────────
async function setAdminRole(targetUserId: string): Promise<void> {
  console.log(`\n🔍  Looking up user: ${targetUserId}`)

  // First, confirm the user exists to give a clear error message rather than
  // a confusing "user not found" from the update call.
  const { data: existingUser, error: lookupError } =
    await supabaseAdmin.auth.admin.getUserById(targetUserId)

  if (lookupError || !existingUser.user) {
    console.error(`❌  User not found: ${targetUserId}`)
    console.error('   Error:', lookupError?.message ?? 'Unknown error')
    process.exit(1)
  }

  const { email } = existingUser.user
  const currentRole = existingUser.user.app_metadata?.role as string | undefined

  if (currentRole === 'admin') {
    console.log(`ℹ️   User ${email} is already an admin. No changes made.`)
    process.exit(0)
  }

  console.log(`📧  Found user: ${email}`)
  console.log(`🔄  Current app_metadata.role: ${currentRole ?? '(none)'}`)
  console.log(`⬆️   Setting app_metadata.role → 'admin' …`)

  // updateUser with app_metadata performs a MERGE — existing app_metadata
  // keys not mentioned here (e.g. provider, providers) are preserved.
  const { data: updatedUser, error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      app_metadata: { role: 'admin' },
    })

  if (updateError || !updatedUser.user) {
    console.error('❌  Failed to set admin role.')
    console.error('   Error:', updateError?.message ?? 'Unknown error')
    process.exit(1)
  }

  const confirmedRole = updatedUser.user.app_metadata?.role as string | undefined

  if (confirmedRole !== 'admin') {
    console.error('❌  Update appeared to succeed but role was not set correctly.')
    console.error('   app_metadata:', JSON.stringify(updatedUser.user.app_metadata))
    process.exit(1)
  }

  console.log(`\n✅  Success! ${email} is now an admin.`)
  console.log(
    '   ⚠️  The user must sign out and sign back in (or wait up to 1 hour)\n' +
    '      for the new role to appear in their JWT and take effect in the proxy.'
  )
}

setAdminRole(userId).catch((err: unknown) => {
  console.error('❌  Unexpected error:', err)
  process.exit(1)
})
