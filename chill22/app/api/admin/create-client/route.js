import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createM3ULine } from '../../../../lib/xtream';
import { sendCredentialsEmail } from '../../../../lib/email';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { fullName, email, pack = 152, sub = 12, note, country } = body;

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Create M3U line on new panel
    const line = await createM3ULine({ pack, sub, note, country });

    // 2. Create Supabase Auth user
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 3. Insert client
    const { error: clientError } = await supabase.from('clients').insert({
      id: authUser.user.id,
      full_name: fullName || null,
      email,
    });

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 400 });
    }

    // 4. Get portal URL
    const { data: hostConfig } = await supabase
      .from('host_config')
      .select('portal_url')
      .eq('id', 1)
      .single();

    // 5. Save subscription
    await supabase.from('subscriptions').insert({
      client_id: authUser.user.id,
      username: line.username,
      password: line.password,
      m3u_url: line.m3uUrl,
      package_id: String(pack),
      status: 'active',
    });

    // 6. Send credentials email
    await sendCredentialsEmail({
      to: email,
      name: fullName,
      username: line.username,
      password: line.password,
      m3uUrl: line.m3uUrl,
      portalUrl: hostConfig?.portal_url || '',
      loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://promaxip-v6-22222.vercel.app'}/login`,
      tempPassword,
    });

    return NextResponse.json({ success: true, username: line.username, password: line.password });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
