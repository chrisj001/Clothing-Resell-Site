import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { webhookRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { resend } from '../../../../lib/resend';

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
      
      // ── Retrieve items — prefer the Supabase cache over Stripe metadata ──────
      // Stripe metadata values are capped at 500 chars. Large carts store items in
      // checkout_item_cache before session creation; the UUID is passed as
      // items_cache_id. Fall back to inline metadata for small/legacy carts.
      let items: any[] = [];
      const itemsCacheId = metadata.items_cache_id || null;
      if (itemsCacheId) {
        const { data: cachedItems } = await supabaseAdmin
          .from('checkout_item_cache')
          .select('items')
          .eq('id', itemsCacheId)
          .single();
        if (cachedItems?.items) {
          items = cachedItems.items;
          // Delete cache entry now that we have the data
          await supabaseAdmin.from('checkout_item_cache').delete().eq('id', itemsCacheId);
        } else {
          console.error(`[webhook] Cache miss for items_cache_id: ${itemsCacheId}`);
        }
      } else {
        try {
          if (metadata.items && metadata.items !== 'too_large') {
            items = JSON.parse(metadata.items);
          }
        } catch (e) {
          console.error('[webhook] Failed to parse items from metadata');
        }
      }

      // Idempotency guard — skip if this session was already fulfilled
      const { data: existingOrder } = await supabaseAdmin.from('orders').select('id').eq('stripe_session_id', sessionOrIntent.id).single();
      if (existingOrder) {
        console.log(`Order already exists for ${sessionOrIntent.id}, skipping.`);
        return NextResponse.json({ received: true });
      }

      // Guest orders receive a one-time UUID token so the guest can look up
      // their order via /api/orders/guest without creating an account.
      const guestToken: string | null = userId ? null : crypto.randomUUID();

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
          loyalty_points_earned: loyaltyPoints,
          guest_token: guestToken,
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

      // Atomically increment discount usage — single SQL UPDATE with a WHERE guard
      // eliminates the read-then-write race condition that allowed codes to be
      // used more times than their max_uses limit under concurrent load.
      if (appliedDiscountId) {
        const { data: incremented } = await supabaseAdmin.rpc('increment_discount_uses', {
          p_discount_id: appliedDiscountId,
        });
        if (!incremented) {
          console.warn(`[webhook] Discount ${appliedDiscountId} limit already reached at fulfilment time.`);
        }
      }

      console.log(`Successfully processed order for: ${sessionOrIntent.id}`);

      // Send Order Receipt Email
      if (resend && (guestEmail || userId)) {
        const emailToUse = guestEmail || sessionOrIntent.customer_details?.email;
        if (emailToUse) {
          const itemsHtml = items.map((item: any) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} ${item.size ? `(Size: ${item.size})` : ''}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 1}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">£${item.price}</td>
            </tr>
          `).join('');

          await resend.emails.send({
            from: 'Acme <onboarding@resend.dev>', // Replace with your domain later
            to: [emailToUse],
            subject: `Your Receipt for Order #${order.id.substring(0, 8).toUpperCase()}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #0f172a;">Thank you for your order!</h1>
                <p>We've received your order and are getting it ready for shipment.</p>
                
                <h3 style="margin-top: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">Order Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr>
                      <th style="text-align: left; padding: 10px; border-bottom: 2px solid #eee;">Item</th>
                      <th style="text-align: center; padding: 10px; border-bottom: 2px solid #eee;">Qty</th>
                      <th style="text-align: right; padding: 10px; border-bottom: 2px solid #eee;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" style="text-align: right; padding: 10px; font-weight: bold;">Total Paid:</td>
                      <td style="text-align: right; padding: 10px; font-weight: bold;">£${order.total_amount}</td>
                    </tr>
                  </tfoot>
                </table>
                
                <p style="margin-top: 24px; color: #64748b; font-size: 14px;">If you have any questions, please reply to this email.</p>
              </div>
            `,
          }).catch(e => console.error('Failed to send receipt:', e));
        }
      }

    } catch (err: any) {
      console.error(`Error processing webhook fulfillment: ${err.message}`);
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
