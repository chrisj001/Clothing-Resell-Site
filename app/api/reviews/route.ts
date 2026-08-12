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
    let user = null;
    try {
      const { data } = await supabaseServer.auth.getUser();
      user = data.user;
    } catch (authError) {
      console.error('Supabase auth error in reviews:', authError);
      return NextResponse.json({ error: 'Authentication service unavailable. Please try again.' }, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { productId, customerId, rating, comment } = await req.json();

    if (customerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify the reviewer actually purchased this product.
    // orders.items is a JSONB array — @> checks if any element has a matching id.
    // Prevents review bombing and fake social proof on products never bought.
    const { data: purchase } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('customer_id', user.id)
      .eq('status', 'paid')
      .contains('items', [{ id: productId }])
      .limit(1)
      .maybeSingle();

    if (!purchase) {
      return NextResponse.json(
        { error: 'You can only review products you have purchased' },
        { status: 403 }
      );
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