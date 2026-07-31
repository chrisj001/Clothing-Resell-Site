import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiRateLimit, getClientIp } from '../../../../lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  // Rate limit to prevent brute-force enumeration of session IDs
  const ip = getClientIp(req);
  const { success } = await apiRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  // Use service role to bypass RLS so guests can see their order number.
  // Only returns order_number (non-sensitive) for a specific Stripe session ID.
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error || !order) {
    // If the webhook hasn't finished yet, it might not exist. Return a 404 so the client can retry.
    return NextResponse.json({ error: 'Order not found yet' }, { status: 404 });
  }

  return NextResponse.json({ order_number: order.order_number });
}
