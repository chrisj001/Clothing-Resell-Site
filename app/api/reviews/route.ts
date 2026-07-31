import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '../../../lib/supabase-server';
import { strictRateLimit, getClientIp } from '../../../lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success } = await strictRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const supabaseServer = await createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { productId, customerId, rating, comment } = await req.json();

    if (customerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!productId || !customerId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Insert the review
    const { error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        product_id: productId,
        customer_id: customerId,
        rating,
        comment
      });

    if (reviewError) {
      if (reviewError.message.includes('unique_product_review')) {
        return NextResponse.json({ error: 'You have already reviewed this product.' }, { status: 400 });
      }
      throw reviewError;
    }

    // 2. Award 50 loyalty points atomically via RPC
    await supabaseAdmin.rpc('increment_loyalty_points', {
      target_user_id: customerId,
      points_to_add: 50,
      points_to_deduct: 0,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in reviews route:', err);
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}