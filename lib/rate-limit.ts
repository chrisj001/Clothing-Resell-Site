import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

/**
 * Standard rate limiter for API routes.
 * Allows 10 requests per 10 seconds per IP.
 * Good for checkout, payment, and review endpoints.
 */
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'ratelimit:api',
});

/**
 * Stricter rate limiter for sensitive operations.
 * Allows 5 requests per 60 seconds per IP.
 * Good for login attempts, discount code validation, etc.
 */
export const strictRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
  prefix: 'ratelimit:strict',
});

/**
 * Webhook rate limiter (more generous since Stripe may batch events).
 * Allows 30 requests per 10 seconds per IP.
 */
export const webhookRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '10 s'),
  analytics: true,
  prefix: 'ratelimit:webhook',
});

/**
 * Get the client IP from a request.
 * Prioritises trusted platform headers (Vercel) over the client-spoofable
 * X-Forwarded-For. Falls back to 'anonymous' only as a last resort.
 */
export function getClientIp(req: Request): string {
  // Vercel platform header — set by the edge, cannot be spoofed by the client
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0].trim();
  }

  // x-real-ip — typically set by a trusted reverse proxy (nginx, Cloudflare)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // X-Forwarded-For — least trusted, client can spoof in direct connections.
  // Still useful behind a reverse proxy that overwrites or appends correctly.
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return 'anonymous';
}
