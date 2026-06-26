import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createM3ULine } from '../../../../lib/xtream';
import { sendCredentialsEmail } from '../../../../lib/email';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { message, history } = await request.json();
    const supabase = createAdminClient();

    const systemPrompt = `You are an AI assistant for ProMax IPTV, an IPTV reseller business.
You help the admin manage clients, subscriptions, and communications.

When you need to perform an action, output ONLY a JSON block on its own line like this:
ACTION:{"action":"create_trial","email":"...","name":"..."}

Available actions:
- Send test line / create account: ACTION:{"action":"create_trial","email":"...","name":"..."}
- Check client status: ACTION:{"action":"check_status","email":"..."}

IMPORTANT: 
- Output the ACTION: line FIRST, then your friendly message
- Never show raw JSON in your conversational reply
- If email is missing, ask for it before acting
- Be concise and friendly`;

    const msgs = [
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, system: systemPrompt, messages: msgs }),
    });

    const aiData = await aiRes.json();
    const rawReply = aiData.content?.[0]?.text || 'Sorry, I could not process that.';

    // Parse ACTION: prefix format
    const actionMatch = rawReply.match(/ACTION:\s*(\{[\s\S]*?\})/);
    let actionResult = '';

    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1]);

        if (action.action === 'create_trial' || action.action === 'create_subscription') {
          const { data: hostConfig } = await supabase.from('host_config').select('portal_url').eq('id', 1).single();
          
          // Create line on new panel (pack 152, sub 12 = 1 year)
          const line = await createM3ULine({ pack: 152, sub: 12, note: action.name || '' });

          const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: action.email,
            password: tempPassword,
            email_confirm: true,
          });

          if (!authError && line.username) {
            await supabase.from('clients').insert({
              id: authUser.user.id,
              full_name: action.name || null,
              email: action.email
            });
            await supabase.from('subscriptions').insert({
              client_id: authUser.user.id,
              username: line.username,
              password: line.password,
              m3u_url: line.m3uUrl,
              package_id: '152',
              status: 'active',
            });
            await sendCredentialsEmail({
              to: action.email,
              name: action.name,
              username: line.username,
              password: line.password,
              m3uUrl: line.m3uUrl,
              portalUrl: hostConfig?.portal_url || '',
            });
            actionResult = `\n\n✅ Done! Account created for ${action.email}\n👤 Username: ${line.username}\n🔑 Password: ${line.password}\n📧 Credentials email sent!`;
          } else {
            actionResult = `\n\n❌ Error: ${authError?.message || 'Could not create line on panel'}`;
          }
        }

        if (action.action === 'check_status') {
          const { data: client } = await supabase
            .from('clients')
            .select('*, subscriptions(*)')
            .eq('email', action.email)
            .single();
          
          if (client) {
            const sub = client.subscriptions?.[0];
            actionResult = `\n\n📋 Client: ${client.full_name || client.email}\n✅ Status: ${sub?.status || 'No subscription'}\n👤 Username: ${sub?.username || '—'}\n📅 Expiry: ${sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : 'N/A'}`;
          } else {
            actionResult = `\n\n❌ No client found with email ${action.email}`;
          }
        }
      } catch (e) {
        actionResult = `\n\n⚠️ Action error: ${e.message}`;
      }
    }

    // Remove ACTION: line and any leftover JSON from display
    const cleanReply = rawReply
      .replace(/ACTION:\s*\{[\s\S]*?\}/g, '')
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .trim();

    return NextResponse.json({ reply: cleanReply + actionResult });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
