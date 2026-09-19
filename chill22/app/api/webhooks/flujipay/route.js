import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Constant-time string compare; different lengths are simply a mismatch.
function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// HMAC-SHA256 of the raw request body, sent as hex (any case) or base64,
// optionally prefixed "sha256=".
function isValidSignature(rawBody, signature, secret) {
  const mac = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const given = signature.trim().replace(/^sha256=/i, '');
  return safeEqual(given.toLowerCase(), mac.toString('hex')) || safeEqual(given, mac.toString('base64'));
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-flujipay-signature');

    // Verify the signature BEFORE parsing or acting on anything. Fails closed: without a
    // configured secret, a signature header, and a matching signature, nothing is processed.
    // The Vercel variable is FLUJIPAY_SECRET_KEY; FLUJIPAY__CRET_KEY is also accepted.
    const webhookSecret = process.env.FLUJIPAY_SECRET_KEY || process.env.FLUJIPAY__CRET_KEY;
    if (!webhookSecret) {
      console.error('FlujiPay webhook rejected: FLUJIPAY_SECRET_KEY is not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }
    if (!signature || !isValidSignature(rawBody, signature, webhookSecret)) {
      // Header names only (never values) so a format mismatch can be diagnosed from the logs.
      console.warn('FlujiPay webhook rejected:', signature ? 'signature mismatch' : 'missing x-flujipay-signature header',
        '| headers received:', [...request.headers.keys()].join(', '));
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Only process completed payments
    if (payload.event !== 'payment.completed' || payload.payment?.status !== 'completed') {
      return NextResponse.json({ received: true });
    }

    const { payment, customer, payment_link } = payload;

    const supabase = createAdminClient();

    // Find client by email if exists
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('email', customer?.email)
      .single();

    // Insert order
    await supabase.from('orders').insert({
      client_id: client?.id || null,
      plan_label: payment_link?.title || 'FlujiPay Payment',
      amount: parseFloat(payment?.amount) || 0,
      status: 'paid',
      notes: `Phone: ${customer?.phone || '—'} | TRX: ${payment?.trx || '—'} | Gateway: ${payment?.gateway || '—'}`,
      customer_email: customer?.email || null,
      customer_name: customer?.name || null,
      customer_phone: customer?.phone || null,
      created_at: payment?.paid_at || new Date().toISOString(),
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
