import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../../lib/resend';
import { apiRateLimit, getClientIp } from '../../../../lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success } = await apiRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { email, userId, fullName } = await req.json();

    if (!email || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!resend) {
      console.error('Resend is not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Check if they already have a welcome code (prevent abuse)
    const { data: existingCodes } = await supabaseAdmin
      .from('discount_codes')
      .select('id')
      .eq('allowed_user_id', userId)
      .limit(1);

    if (existingCodes && existingCodes.length > 0) {
      return NextResponse.json({ message: 'Welcome email already sent' }, { status: 200 });
    }

    // Generate a random 6-character code
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const discountCode = `WELCOME-${randomSuffix}`;

    // Insert into DB
    const { error: insertError } = await supabaseAdmin.from('discount_codes').insert({
      code: discountCode,
      discount_type: 'percentage',
      discount_value: 10, // 10% off
      is_active: true,
      max_uses: 1, // Can only use it once
      current_uses: 0,
      allowed_user_id: userId
    });

    if (insertError) {
      console.error('Failed to create discount code:', insertError);
      return NextResponse.json({ error: 'Failed to create discount code' }, { status: 500 });
    }

    // Send the email
    const firstName = fullName ? fullName.split(' ')[0] : 'there';
    
    const { error: emailError } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>', // Replace with verified domain later
      to: [email],
      subject: 'Welcome! Here is your 10% discount',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #0f172a;">Welcome to CJ Threads, ${firstName}! 🎉</h1>
          <p>We are so excited to have you join our community.</p>
          <p>As a special thank you, we've generated a unique 10% off discount code just for you. You can use it on your first purchase!</p>
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Your Discount Code</p>
            <h2 style="margin: 10px 0 0 0; font-size: 32px; color: #0d9488; letter-spacing: 2px;">${discountCode}</h2>
          </div>
          
          <p><em>Note: This code is tied securely to your account and can only be used once.</em></p>
          <p>Happy hunting!</p>
          <p>- The CJ Threads Team</p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // We don't fail the request completely because the code was created
    }

    return NextResponse.json({ success: true, message: 'Welcome email sent' });
  } catch (err: any) {
    console.error('Error in welcome email route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
