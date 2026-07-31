import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '../../../lib/supabase-server';
import { apiRateLimit, getClientIp } from '../../../lib/rate-limit';

// Initialize Stripe with the secret key from environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-06-24.dahlia' as any,
});

// Initialize server-side Supabase client (read-only for settings)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for mock order creation
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success } = await apiRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
    }

    const supabaseServer = await createServerClient();
    const { data: { session: authSession } } = await supabaseServer.auth.getSession();
    if (!authSession) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { cartItems, discountCode, guestEmail } = body;
    const userId = authSession.user.id;

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

    // Fetch dynamic loyalty ratio from settings
    const { data: settings } = await supabase.from('store_settings').select('loyalty_ratio').eq('id', 1).single();
    const loyaltyRatio = settings?.loyalty_ratio || 10;

    let totalItemsPrice = cartItems.reduce((acc: number, item: any) => acc + (priceMap[item.id] * item.quantity), 0);
    let discountAmount = 0;
    
    // Apply mock discount code logic
    let appliedDiscountId = null;
    let dbCode: any = null;
    
    if (discountCode) {
      const upperCode = discountCode.toUpperCase();
      
      // Fetch the code from the database
      const { data: fetchedCode, error: codeError } = await supabaseAdmin
        .from('discount_codes')
        .select('*')
        .eq('code', upperCode)
        .eq('is_active', true)
        .single();
        
      if (codeError || !fetchedCode) {
        return NextResponse.json({ error: 'Invalid or inactive discount code' }, { status: 400 });
      }
      
      if (fetchedCode.max_uses !== null && fetchedCode.current_uses >= fetchedCode.max_uses) {
        return NextResponse.json({ error: 'This discount code has reached its usage limit' }, { status: 400 });
      }

      if (fetchedCode.discount_type === 'percentage') {
        discountAmount = totalItemsPrice * (fetchedCode.discount_value / 100);
      } else if (fetchedCode.discount_type === 'fixed') {
        discountAmount = fetchedCode.discount_value;
      }
      
      appliedDiscountId = fetchedCode.id;
      dbCode = fetchedCode;
    }

    let finalPrice = Math.max(0, totalItemsPrice - discountAmount);

    // Fetch dynamic loyalty ratio
    // settings and loyaltyRatio already fetched above at line 30
    const loyaltyPointsEarned = Math.floor(finalPrice * loyaltyRatio);

    // If Stripe key is a placeholder, we just simulate success
    if (stripeSecretKey === 'sk_test_placeholder' || !stripeSecretKey) {
      console.log(`Mock checkout for ${cartItems.length} items at £${finalPrice}`);
      
      let mockShippingAddress = {
        line1: "123 Mock Checkout Street",
        city: "London",
        postal_code: "SW1A 1AA",
        country: "GB"
      };

      if (userId) {
        const { data: profileAddress } = await supabaseAdmin
          .from('profiles')
          .select('address_line1, city, postal_code, country, use_for_checkout')
          .eq('id', userId)
          .single();
          
        if (profileAddress && profileAddress.use_for_checkout && profileAddress.address_line1) {
          mockShippingAddress = {
            line1: profileAddress.address_line1,
            city: profileAddress.city || '',
            postal_code: profileAddress.postal_code || '',
            country: profileAddress.country || 'GB'
          };
        }
      }
      
      const mockOrderItems = cartItems.map((i: any) => ({ ...i, price: priceMap[i.id] }));

      // Create mock order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          customer_id: userId || null,
          total_amount: finalPrice,
          stripe_session_id: 'mock_session_' + Date.now(),
          status: 'paid',
          shipping_address: mockShippingAddress,
          customer_email: userId ? null : guestEmail,
          items: mockOrderItems,
          loyalty_points_earned: loyaltyPointsEarned
        })
        .select()
        .single();

      if (orderError) {
        console.error("Failed to create mock order:", orderError);
        return NextResponse.json({ error: "Failed to save mock order: " + orderError.message }, { status: 500 });
      }

      // Mark items as sold
      if (cartItems.length > 0) {
        const productIds = cartItems.map((i: any) => i.id);
        await supabaseAdmin.from('products').update({ status: 'sold' }).in('id', productIds);
      }

      // Add loyalty points atomically via RPC
      if (userId && loyaltyPointsEarned > 0) {
        await supabaseAdmin.rpc('increment_loyalty_points', {
          target_user_id: userId,
          points_to_add: loyaltyPointsEarned,
          points_to_deduct: 0,
        });
      }

      // Increment discount code usage if one was applied
      if (appliedDiscountId) {
        const { data: currentCode } = await supabaseAdmin.from('discount_codes').select('current_uses').eq('id', appliedDiscountId).single();
        if (currentCode) {
          await supabaseAdmin.from('discount_codes').update({ current_uses: (currentCode.current_uses || 0) + 1 }).eq('id', appliedDiscountId);
        }
      }

      return NextResponse.json({ 
        url: `/checkout/success?order_number=${order.order_number}`,
        message: 'Mock checkout successful (Stripe keys not set)'
      });
    }

    // Create Stripe Checkout Session
    // Distribute discount proportionally or just apply as a single line item
    // For simplicity, we'll map items exactly, and add a discount line item if applicable.
    
    const line_items = cartItems.map((item: any) => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.name,
          description: item.size ? `Size: ${item.size}` : undefined,
        },
        unit_amount: Math.round(priceMap[item.id] * 100),
      },
      quantity: item.quantity,
    }));

    let stripeCouponId = undefined;

    if (discountAmount > 0 && dbCode) {
      // Generate a dynamic Stripe Coupon for this session
      const coupon = await stripe.coupons.create({
        amount_off: dbCode.discount_type === 'fixed' ? Math.round(dbCode.discount_value * 100) : undefined,
        percent_off: dbCode.discount_type === 'percentage' ? dbCode.discount_value : undefined,
        currency: dbCode.discount_type === 'fixed' ? 'gbp' : undefined,
        duration: 'once',
        name: `${dbCode.code} Discount`
      });
      stripeCouponId = coupon.id;
    }

    // Prepare items list for metadata so the webhook knows what was bought
    const orderItemsJson = JSON.stringify(cartItems.map((i: any) => ({
      id: i.id,
      name: i.name,
      price: priceMap[i.id],
      quantity: i.quantity,
      size: i.size
    })));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: userId ? undefined : guestEmail,
      shipping_address_collection: {
        allowed_countries: ['GB', 'US', 'CA', 'AU', 'IE'], // Allowed shipping countries
      },
      client_reference_id: userId || 'guest',
      discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
      metadata: {
        loyalty_points: loyaltyPointsEarned.toString(),
        items: orderItemsJson.length > 500 ? 'too_large' : orderItemsJson, // Stripe has 500 char metadata limit
        user_id: userId || '',
        guest_email: guestEmail || '',
        applied_discount_id: appliedDiscountId || ''
      },
      success_url: `${req.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/?cart=open`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error in checkout route:', err);
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
