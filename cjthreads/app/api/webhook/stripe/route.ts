import { NextResponse } from 'next/server';

// This endpoint has been deprecated in favor of /api/webhooks/stripe/
// which has proper signature verification and inventory management.
// Redirect any incoming requests to the canonical endpoint.
export async function POST(req: Request) {
  return NextResponse.json(
    { error: 'This webhook endpoint has been deprecated. Use /api/webhooks/stripe/ instead.' },
    { status: 410 }
  );
}
