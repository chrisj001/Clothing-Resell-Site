import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ── Step 1: Cryptographically verify the session.
  // getUser() makes a round-trip to Supabase Auth to validate the signed JWT.
  // getSession() must NOT be used here — it reads the cookie without server
  // verification, so a tampered token could bypass auth checks.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // ── Step 2: Require authentication for all protected routes.
  const protectedRoutes: string[] = ['/dashboard', '/admin']
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── Step 3: Require admin role for /admin/* routes.
  //
  // The role is read from user.app_metadata — a field embedded in the signed
  // JWT that can ONLY be written by the Supabase service-role key (Admin API).
  // This means:
  //   ✅ Zero DB queries — no extra network latency on every admin page load
  //   ✅ Cannot be forged by a client (JWT is cryptographically signed)
  //   ⚠️  Role changes propagate after the next token refresh (default ≤1h TTL)
  //
  // Previously this block made a second database query to profiles.role on
  // every single /admin/* request — that pattern has been removed.
  if (pathname.startsWith('/admin') && user) {
    const role = user.app_metadata?.role as string | undefined

    if (role !== 'admin') {
      // Authenticated but not an admin — redirect safely to customer dashboard
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
}
