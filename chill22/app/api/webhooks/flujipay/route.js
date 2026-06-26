import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-flujipay-signature');

    // Verify signature
    const webhookSecret = process.env.FLUJIPAY_SECRET_KEY;
    if (webhookSecret && signature) {
      const expected = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      if (expected !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
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
