import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createM3ULine, panelRequest } from '../../../../lib/xtream';
import { sendCredentialsEmail } from '../../../../lib/email';
import { requireAdmin } from '../../../../lib/require-admin';

export const runtime = 'nodejs';

// Panel "sub" codes -> plan label shown to the client.
const PLAN_LABELS = { 5: '1 Day Trial', 1: '1 Month', 3: '3 Months', 12: '1 Year' };
const DEFAULT_SUB = { create_trial: 5, create_subscription: 12 };
// Reseller pack used for every line created here (trials included) — change it in one place.
const PANEL_PACK = 152;

// Client-facing message the admin copies and sends. Placeholders: {M3U_URL} {USERNAME} {PASSWORD} {PLAN}
const CLIENT_TEMPLATE = `🎉 **Your ProMax IPTV Subscription Is Active!**

Hello,

Your account has been successfully activated and is ready to use!

━━━━━━━━━━━━━━━━━━━━━━
📦 **YOUR ACCOUNT DETAILS**
━━━━━━━━━━━━━━━━━━━━━━

🌐 **M3U URL:** {M3U_URL}
👤 **Username:** {USERNAME}
🔑 **Password:** {PASSWORD}
🌐 **Portal URL:** http://37.59.104.57

📅 **Plan:** {PLAN}

━━━━━━━━━━━━━━━━━━━━━━
📲 **HOW TO SET UP — STEP BY STEP**
━━━━━━━━━━━━━━━━━━━━━━

📱 **STEP 1 — Download IBO Pro Player**
Visit iboproapp.com

- iPhone/iPad: Search "IBO Pro" on the App Store
- Android: Search "IBO Pro" on Google Play
- Android TV / Fire Stick: Search "IBO Pro" in your app store

⚙️ **STEP 2 — Add Your Playlist**
Open IBO Pro Player, tap **"Add Playlist"**, then select **"M3U URL"**

🔗 **STEP 3 — Enter Your Details**
- Paste your M3U link above
- Name it "ProMax IPTV"
- Tap **"Add"** and wait for channels to load

▶️ **STEP 4 — Enjoy!**
Browse Live TV, Movies, and Series — everything is ready for you 🎬

━━━━━━━━━━━━━━━━━━━━━━
📢 **JOIN OUR WHATSAPP CHANNEL**
━━━━━━━━━━━━━━━━━━━━━━

Stay up to date with the latest news, updates, and special offers.

👉 Join here: https://whatsapp.com/channel/0029Vb7H2f0FMqrTpCXGcT1Y

━━━━━━━━━━━━━━━━━━━━━━
⚠️ **IMPORTANT NOTES**
━━━━━━━━━━━━━━━━━━━━━━

- Do not share your credentials with anyone.
- Your subscription works on a maximum of 1 device at a time.
- If you have any issues, contact us immediately.

💬 **Need help?** WhatsApp us anytime:
👉 +44 7441 429495

Enjoy your service! 🎬✨
— **ProMax IPTV Team**
[www.promax-iptv.com](https://www.promax-iptv.com)`;

// The template is followed in the chat by this marker; it is also where old
// assistant messages are cut before being sent back to the model as history
// (so credentials and the long template don't get re-sent every turn).
const TEMPLATE_LABEL = '📋 Copy Template';

// Raw panel responses are shown in the chat until the VPN parameters are confirmed.
// Set PANEL_DEBUG=0 in the environment to hide them.
const SHOW_PANEL_DEBUG = process.env.PANEL_DEBUG !== '0';

function buildClientMessage({ m3uUrl, username, password, plan, altUrl }) {
  // Function replacers so "$&"-style sequences in a password aren't interpreted.
  const m3uBlock = (m3uUrl || '⚠️ (panel did not return an M3U URL)')
    + (altUrl ? `\n🌐 **VPS M3U URL (alternative):** ${altUrl}` : '');
  return CLIENT_TEMPLATE
    .replaceAll('{M3U_URL}', () => m3uBlock)
    .replaceAll('{USERNAME}', () => username)
    .replaceAll('{PASSWORD}', () => password || '—')
    .replaceAll('{PLAN}', () => plan);
}

// Panel error replies look like { status: 'error', ... } (see createM3ULine).
function looksOk(call) {
  if (call.error || call.httpStatus >= 400) return false;
  const first = Array.isArray(call.body) ? call.body[0] : call.body;
  if (first && typeof first === 'object' && first.status === 'error') return false;
  return !(typeof first === 'string' && /error|invalid|unknown|not found/i.test(first));
}

// Only accept a URL as an "alternative connection" if it carries this account's own
// username and password, so we never put an unrelated server URL in a client message.
function findAlternativeUrl(value, line) {
  if (typeof value === 'string') {
    const isUrl = /^https?:\/\//i.test(value);
    const forThisAccount = value.includes(line.username) && (!line.password || value.includes(line.password));
    return isUrl && forThisAccount && value !== line.m3uUrl ? value : null;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) {
      const hit = findAlternativeUrl(v, line);
      if (hit) return hit;
    }
  }
  return null;
}

// Best-effort: look up stream/server options for the new line and try to switch it to VPN mode.
// The panel's exact action names/params are unconfirmed, so every response is collected for display.
async function tryVpnOptions(line) {
  const calls = [];
  const lookup = { username: line.username, password: line.password, ...(line.userId != null && { user_id: line.userId }) };

  const [servers, lines] = await Promise.all([
    panelRequest('get_servers', {}, 'get_servers'),
    panelRequest('get_user_lines', lookup, 'get_user_lines'),
  ]);
  calls.push(servers, lines);

  let altUrl = findAlternativeUrl(lines.body, line);
  let note = '';

  if (line.userId == null) {
    note = 'No user id in the create response, so edit_user / set_vpn were skipped.';
  } else {
    let edit = await panelRequest('edit_user', { user_id: line.userId, vpn: 1 }, 'edit_user');
    calls.push(edit);
    if (!looksOk(edit)) {
      edit = await panelRequest('set_vpn', { user_id: line.userId, vpn: 1 }, 'set_vpn');
      calls.push(edit);
    }
    note = looksOk(edit)
      ? `VPN mode request accepted via "${edit.action}" — confirm the line still works before sending.`
      : 'Neither edit_user nor set_vpn was accepted (see responses).';

    const after = await panelRequest('get_user_lines', lookup, 'get_user_lines (after VPN)');
    calls.push(after);
    altUrl = altUrl || findAlternativeUrl(after.body, line);
  }

  return { calls, altUrl, note };
}

function formatPanelDebug({ calls, note }) {
  const apiKey = process.env.XTREAM_RESELLER_API_KEY;
  const redact = (s) => (apiKey ? s.split(apiKey).join('[api_key]') : s);
  const blocks = calls.map((c) => {
    const { password, ...params } = c.params || {};
    const head = `▸ ${c.label} ${JSON.stringify(params)}`;
    if (c.error) return `${head}\n  request failed: ${c.error}`;
    const body = typeof c.body === 'string' ? c.body : JSON.stringify(c.body, null, 2);
    const shown = redact(body).slice(0, 1200);
    return `${head} → HTTP ${c.httpStatus}\n${shown}${body.length > 1200 ? '\n… (truncated)' : ''}`;
  });
  return `\n\n🔧 Panel responses (debug)\n${note}\n\n${blocks.join('\n\n')}`;
}

export async function POST(request) {
  // Admin-only: nothing below runs (no body parsing, no panel/DB/model calls) without a valid session.
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { message, history } = await request.json();
    const supabase = createAdminClient();

    const systemPrompt = `You are an AI assistant for ProMax IPTV, an IPTV reseller business.
You help the admin manage clients, subscriptions, and communications.

When you need to perform an action, output ONLY a JSON block on its own line like this:
ACTION:{"action":"create_trial","sub":5}

Available actions:
- Create a trial / test line: ACTION:{"action":"create_trial","sub":5}
- Create a paid subscription line: ACTION:{"action":"create_subscription","sub":1}
- Check client status: ACTION:{"action":"check_status","email":"..."}

Plan codes for "sub": 5 = 1 day trial, 1 = 1 month, 3 = 3 months, 12 = 1 year.
Add "email" and/or "name" to a create action ONLY if the admin actually gave them.

IMPORTANT:
- Output the ACTION: line FIRST, then ONE short friendly sentence
- Create immediately. NEVER ask for a name or email before creating a line — they are optional
- A test/trial line is always sub 5 unless the admin says otherwise
- For a paid subscription use the duration the admin states; only if they give no duration, ask which plan
- The system attaches the credentials and the client message after your reply. Never write credentials or the client message yourself
- Never show raw JSON in your conversational reply
- check_status needs an email; ask for it only for that action
- Be concise and friendly`;

    const msgs = [
      ...history.slice(-6).map(m => ({
        role: m.role,
        content: m.role === 'assistant' ? m.content.split(TEMPLATE_LABEL)[0].trim() : m.content,
      })),
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
          const sub = Number(action.sub) || DEFAULT_SUB[action.action];
          const plan = PLAN_LABELS[sub];

          if (!plan) {
            const supported = Object.entries(PLAN_LABELS).map(([code, label]) => `${code} = ${label}`).join(', ');
            actionResult = `\n\n❌ Unsupported plan code (sub=${action.sub}). Supported: ${supported}`;
          } else {
            const email = typeof action.email === 'string' ? action.email.trim() : '';
            const name = typeof action.name === 'string' ? action.name.trim() : '';

            // Create on the panel first, right away — email/name are optional.
            // (sub picks the duration)
            const line = await createM3ULine({ pack: PANEL_PACK, sub, note: name });
            const notes = [`✅ Done! ${plan} line created`];

            // Saving to the database / emailing is best-effort: the credentials below must reach
            // the admin even if e.g. the email already has an account.
            if (!email) {
              notes.push('ℹ️ No email given — line exists on the panel only (not saved to a client record, no email sent).');
            } else {
              try {
                const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                  email,
                  password: tempPassword,
                  email_confirm: true,
                });

                if (authError) {
                  notes.push(`⚠️ Not saved to a client record: ${authError.message}`);
                } else {
                  const { error: clientError } = await supabase.from('clients').insert({
                    id: authUser.user.id,
                    full_name: name || null,
                    email,
                  });
                  const { error: subError } = await supabase.from('subscriptions').insert({
                    client_id: authUser.user.id,
                    username: line.username,
                    password: line.password,
                    m3u_url: line.m3uUrl,
                    package_id: String(PANEL_PACK),
                    status: 'active',
                  });
                  if (clientError || subError) {
                    notes.push(`⚠️ Database save problem: ${(clientError || subError).message}`);
                  } else {
                    notes.push(`💾 Saved for ${email}`);
                  }

                  const { data: hostConfig } = await supabase.from('host_config').select('portal_url').eq('id', 1).single();
                  await sendCredentialsEmail({
                    to: email,
                    name,
                    username: line.username,
                    password: line.password,
                    m3uUrl: line.m3uUrl,
                    portalUrl: hostConfig?.portal_url || '',
                  });
                  notes.push('📧 Credentials email sent');
                }
              } catch (e) {
                notes.push(`⚠️ Saved/emailed with errors: ${e.message}`);
              }
            }

            let vpn = { calls: [], altUrl: null, note: '' };
            try {
              vpn = await tryVpnOptions(line);
            } catch (e) {
              vpn.note = `VPN lookup failed: ${e.message}`;
            }

            const clientMessage = buildClientMessage({
              m3uUrl: line.m3uUrl,
              username: line.username,
              password: line.password,
              plan,
              altUrl: vpn.altUrl,
            });

            actionResult = `\n\n${notes.join('\n')}\n\n${TEMPLATE_LABEL}\n${clientMessage}`;
            if (SHOW_PANEL_DEBUG) actionResult += formatPanelDebug(vpn);
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
