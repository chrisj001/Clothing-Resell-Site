import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { webhookRateLimit, getClientIp } from '../../../../lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success } = await webhookRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    let sessionOrIntent = event.data.object as any;
    
    // For Checkout Session, we might need to get the Payment Intent to get shipping address if it's not in the session directly, 
    // but we can just use the object provided.
    
    try {
      const metadata = sessionOrIntent.metadata || {};
      const userId = metadata.user_id || null;
      // Stripe Elements PaymentIntent shipping address is in shipping.address
      const shippingDetails = sessionOrIntent.shipping?.address || sessionOrIntent.shipping_details?.address || sessionOrIntent.customer_details?.address || {};
      const guestEmail = metadata.guest_email || sessionOrIntent.customer_details?.email || sessionOrIntent.receipt_email || null;
      const loyaltyPoints = parseInt(metadata.loyalty_points || '0', 10);
      const redeemedPoints = parseInt(metadata.redeemed_points || '0', 10);
      const appliedDiscountId = metadata.applied_discount_id || null;
      
      let items = [];
      try {
        if (metadata.items && metadata.items !== 'too_large') {
          items = JSON.parse(metadata.items);
        }
      } catch (e) {
        console.error("Failed to parse items from metadata");
      }

      // Check if order already exists to prevent duplicates if both checkout.session and payment_intent fire
      const { data: existingOrder } = await supabaseAdmin.from('orders').select('id').eq('stripe_session_id', sessionOrIntent.id).single();
      if (existingOrder) {
        console.log(`Order already exists for ${sessionOrIntent.id}, skipping.`);
        return NextResponse.json({ received: true });
      }

      // Create the order in Supabase
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          customer_id: userId || null,
          total_amount: (sessionOrIntent.amount_total || sessionOrIntent.amount || 0) / 100,
          stripe_session_id: sessionOrIntent.id,
          status: 'paid',
          shipping_address: shippingDetails,
          customer_email: guestEmail,
          items: items,
          loyalty_points_earned: loyaltyPoints
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update inventory and mark items as sold
      if (items.length > 0) {
        for (const item of items) {
          const { data: product } = await supabaseAdmin.from('products').select('is_single_item, inventory').eq('id', item.id).single();
          
          if (product) {
            if (product.is_single_item !== false) {
              // It's a single item
              await supabaseAdmin.from('products').update({ status: 'sold' }).eq('id', item.id);
            } else {
              // It's a quantity item
              let currentInventory = product.inventory || {};
              const boughtSize = item.size;
              const boughtQty = item.quantity || 1;
              
              if (boughtSize && currentInventory[boughtSize] !== undefined) {
                currentInventory[boughtSize] = Math.max(0, currentInventory[boughtSize] - boughtQty);
              }
              
              // Check if any stock remains across all sizes
              const totalStockRemaining = Object.values(currentInventory).reduce((sum: any, val: any) => sum + (parseInt(val) || 0), 0) as number;
              
              const updateData: any = { inventory: currentInventory };
              if (totalStockRemaining <= 0) {
                updateData.status = 'sold';
              }
              
              await supabaseAdmin.from('products').update(updateData).eq('id', item.id);
            }
          }
        }
      }

      // Update loyalty points atomically via RPC
      if (userId && (loyaltyPoints > 0 || redeemedPoints > 0)) {
        await supabaseAdmin.rpc('increment_loyalty_points', {
          target_user_id: userId,
          points_to_add: loyaltyPoints,
          points_to_deduct: redeemedPoints,
        });
      }

      // Increment discount code usage if one was applied
      if (appliedDiscountId) {
        const { data: currentCode } = await supabaseAdmin.from('discount_codes').select('current_uses').eq('id', appliedDiscountId).single();
        if (currentCode) {
          await supabaseAdmin.from('discount_codes').update({ current_uses: (currentCode.current_uses || 0) + 1 }).eq('id', appliedDiscountId);
        }
      }

      console.log(`Successfully processed order for: ${sessionOrIntent.id}`);
    } catch (err: any) {
      console.error(`Error processing webhook fulfillment: ${err.message}`);
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
