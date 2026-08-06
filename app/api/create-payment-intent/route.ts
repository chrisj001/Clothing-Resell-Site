import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '../../../lib/supabase-server';
import { apiRateLimit, getClientIp } from '../../../lib/rate-limit';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-06-24.dahlia' as any,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in the environment variables');
}
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success } = await apiRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
    }

    const supabaseServer = await createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();

    const body = await req.json();
    const { cartItems, discountCode, redeemedPoints = 0, guestEmail } = body;
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId && !guestEmail) {
      return NextResponse.json({ error: 'An email address is required for checkout' }, { status: 400 });
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const productIds = cartItems.map((i: any) => i.id);
    const { data: dbProducts, error: priceError } = await supabaseAdmin.from('products').select('id, price, title, status').in('id', productIds);
    if (priceError || !dbProducts) {
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    const priceMap: Record<string, number> = {};
    for (const item of cartItems) {
      const dbProduct = dbProducts.find((p: any) => p.id === item.id);
      if (!dbProduct || dbProduct.status !== 'available') {
        return NextResponse.json({ error: 'One or more products are no longer available' }, { status: 400 });
      }
      priceMap[dbProduct.id] = dbProduct.price;
    }

    // Initialize regular supabase client to get settings (optional, but admin is fine here)
    const { data: settings } = await supabaseAdmin.from('store_settings').select('loyalty_ratio').eq('id', 1).single();
    const loyaltyRatio = settings?.loyalty_ratio || 10;

    let totalItemsPrice = cartItems.reduce((acc: number, item: any) => acc + (priceMap[item.id] * item.quantity), 0);
    let discountAmount = 0;
    let appliedDiscountId = null;

    if (discountCode) {
      const upperCode = discountCode.toUpperCase();
      
      const { data: dbCode, error: codeError } = await supabaseAdmin
        .from('discount_codes')
        .select('*')
        .eq('code', upperCode)
        .eq('is_active', true)
        .single();
        
      if (codeError || !dbCode) {
        return NextResponse.json({ error: 'Invalid or inactive discount code' }, { status: 400 });
      }
      
      if (dbCode.max_uses !== null && dbCode.current_uses >= dbCode.max_uses) {
        return NextResponse.json({ error: 'This discount code has reached its usage limit' }, { status: 400 });
      }

      if (dbCode.discount_type === 'percentage') {
        discountAmount = totalItemsPrice * (dbCode.discount_value / 100);
      } else if (dbCode.discount_type === 'fixed') {
        discountAmount = dbCode.discount_value;
      }
      
      appliedDiscountId = dbCode.id;
    }

    // Handle Loyalty Point Redemption
    let pointsDiscount = 0;
    if (redeemedPoints > 0) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('loyalty_points').eq('id', userId).single();
      if (profile && profile.loyalty_points >= redeemedPoints) {
        pointsDiscount = redeemedPoints / 100; // £1 per 100 points
      } else {
        return NextResponse.json({ error: 'Insufficient loyalty points' }, { status: 400 });
      }
    }

    let finalPrice = Math.max(0, totalItemsPrice - discountAmount - pointsDiscount);
    // Customers cannot earn points on an order if they are redeeming points
    const loyaltyPointsEarned = redeemedPoints > 0 ? 0 : Math.floor(finalPrice * loyaltyRatio);
    const finalAmountInCents = Math.round(finalPrice * 100);

    if (finalAmountInCents < 50) {
       return NextResponse.json({ error: 'Amount too low. Minimum charge is £0.50' }, { status: 400 });
    }

    const orderItemsJson = JSON.stringify(cartItems.map((i: any) => ({
      id: i.id,
      name: i.name,
      price: priceMap[i.id],
      quantity: i.quantity,
      size: i.size
    })));

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmountInCents,
      currency: 'gbp',
      // In the latest api, automatic_payment_methods is enabled by default
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: userId ? userEmail : guestEmail,
      metadata: {
        loyalty_points: loyaltyPointsEarned.toString(),
        redeemed_points: redeemedPoints.toString(),
        items: orderItemsJson.length > 500 ? 'too_large' : orderItemsJson,
        user_id: userId || '',
        guest_email: guestEmail || '',
        applied_discount_id: appliedDiscountId || ''
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      discountAmount,
      finalPrice
    });
  } catch (err: any) {
    console.error('Error creating payment intent:', err);
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
