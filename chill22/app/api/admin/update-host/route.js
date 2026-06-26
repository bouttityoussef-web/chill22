import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { baseHostUrl, portalUrl } = body;

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('host_config')
      .update({
        base_host_url: baseHostUrl,
        portal_url: portalUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
