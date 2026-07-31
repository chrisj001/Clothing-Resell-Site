# API Security Contract

> **This document defines the authentication and authorisation rules for all API routes in CJ Threads.**
> Every developer adding or modifying an API route MUST follow these rules.

## Architecture

CJ Threads uses **Next.js App Router** API routes (`app/api/*/route.ts`).

The middleware (`proxy.ts`) only covers `/admin/*` and `/dashboard/*` paths.
**API routes (`/api/*`) are NOT covered by the middleware.** Each API route is its own authentication boundary.

## Required Pattern for Authenticated API Routes

Every API route that performs user-specific actions MUST:

1. **Rate limit** before doing any work
2. **Authenticate** via server-side Supabase session
3. **Derive the user ID from the session** — never trust client-supplied user IDs
4. **Reject unauthenticated requests** with HTTP 401

### Canonical Example

See [`app/api/reviews/route.ts`](app/api/reviews/route.ts) — this is the gold standard:

```typescript
import { createClient as createServerClient } from '../../../lib/supabase-server';
import { apiRateLimit, getClientIp } from '../../../lib/rate-limit';

export async function POST(req: Request) {
  // 1. Rate limit
  const ip = getClientIp(req);
  const { success } = await apiRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 2. Authenticate — BEFORE parsing the body
  const supabaseServer = await createServerClient();
  const { data: { session } } = await supabaseServer.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // 3. Parse body — userId comes from session, not from body
  const body = await req.json();
  const userId = session.user.id;  // ← NEVER from body

  // 4. If the body includes a user-supplied ID (e.g. customerId), verify it
  if (body.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
}
```

### Key Rules

| Rule | Why |
|---|---|
| **Never read `userId` from the request body** | Client-supplied IDs enable IDOR attacks |
| **Always derive user identity from `session.user.id`** | Server-side session is cryptographically verified |
| **Auth check BEFORE `req.json()`** | Prevents unnecessary body parsing for unauthenticated requests |
| **Use `supabaseAdmin` (service role) for DB writes** | Bypasses RLS for trusted server-side operations |
| **Use `createServerClient()` for auth checks** | Cookie-based, server-side, cannot be spoofed by request body |

## Exceptions

| Route | Auth Required? | Reason |
|---|---|---|
| `/api/webhooks/stripe` | No (uses Stripe signature) | Stripe sends webhooks server-to-server with HMAC signature verification |
| `/api/orders/success` | No (rate-limited) | Guest checkout users need to see their order number; rate limiting prevents brute-force |

## Checklist for New API Routes

- [ ] Import `createServerClient` from `lib/supabase-server`
- [ ] Import `apiRateLimit` (or `strictRateLimit`) and `getClientIp` from `lib/rate-limit`
- [ ] Add rate limiting as the first operation
- [ ] Add session check before parsing request body
- [ ] Derive all user identity from `session.user.id`
- [ ] Never destructure `userId` from the request body
- [ ] Use `supabaseAdmin` for privileged DB operations
- [ ] Return appropriate HTTP status codes (401, 403, 429)
