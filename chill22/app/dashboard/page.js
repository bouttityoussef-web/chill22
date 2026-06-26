'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase-browser';

function InfoCard({ label, value, mono, badge, badgeColor }) {
  return (
    <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
      <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{label}</div>
      {badge ? (
        <span style={{ fontSize:12, padding:'4px 10px', borderRadius:20, fontWeight:700, background: badgeColor+'22', color: badgeColor }}>{value}</span>
      ) : (
        <div style={{ fontSize:14, fontFamily: mono?'monospace':'inherit', wordBreak:'break-all', color:'var(--text)', fontWeight: mono?400:500 }}>{value || '—'}</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [sub, setSub] = useState(null);
  const [host, setHost] = useState(null);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const sb = createClient();
    const { data: ud } = await sb.auth.getUser();
    if (!ud?.user) { router.push('/login'); return; }
    setUser(ud.user);

    const [{ data: subData }, { data: hostData }, { data: ordersData }] = await Promise.all([
      sb.from('subscriptions').select('*').eq('client_id', ud.user.id).order('created_at', { ascending:false }).limit(1).single(),
      sb.from('host_config').select('*').eq('id',1).single(),
      sb.from('orders').select('*').eq('client_id', ud.user.id).order('created_at', { ascending:false }).limit(10),
    ]);

    setSub(subData); setHost(hostData); setOrders(ordersData || []);
    setLoading(false);
  }

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push('/login');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>Loading…</div>;

  const isExpired = sub?.end_date && new Date(sub.end_date) < new Date();
  const daysLeft = sub?.end_date ? Math.max(0, Math.ceil((new Date(sub.end_date) - new Date()) / 86400000)) : null;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {/* Header */}
      <header style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--accent)', letterSpacing:'-0.3px' }}>ProMax<span style={{ color:'var(--text)' }}> IPTV</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:13, color:'var(--muted)' }}>{user?.email}</span>
          <button onClick={logout} style={{ background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--muted)', padding:'6px 14px', borderRadius:'var(--radius)', fontSize:13 }}>Sign out</button>
        </div>
      </header>

      <div style={{ maxWidth:780, margin:'0 auto', padding:'32px 24px' }}>
        {/* Status banner */}
        {sub && (
          <div style={{ background: isExpired?'#f8514911':'#00d08411', border:`1px solid ${isExpired?'#f8514933':'#00d08433'}`, borderRadius:'var(--radius-lg)', padding:'16px 20px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:700, color: isExpired?'var(--danger)':'var(--accent)', fontSize:15 }}>
                {isExpired ? '⚠ Subscription Expired' : '✓ Active Subscription'}
              </div>
              {!isExpired && daysLeft !== null && <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{daysLeft} days remaining</div>}
            </div>
            {sub.end_date && <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'var(--muted)' }}>Expires</div>
              <div style={{ fontWeight:600, fontSize:14 }}>{new Date(sub.end_date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
            </div>}
          </div>
        )}

        {!sub && <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:32, textAlign:'center', color:'var(--muted)', marginBottom:24 }}>No active subscription found. Contact support.</div>}

        {sub && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:24, marginBottom:20 }}>
            <h2 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Connection Details</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <InfoCard label="Username" value={sub.username} />
              <InfoCard label="Password" value={sub.password} />
            </div>
            <div style={{ marginBottom:12 }}>
              <InfoCard label="M3U URL" value={sub.m3u_url} mono />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <InfoCard label="Status" value={sub.status} badge badgeColor={sub.status==='active'?'var(--accent)':'var(--danger)'} />
              {host?.portal_url && <InfoCard label="Portal URL" value={host.portal_url} mono />}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={() => copyToClipboard(sub.m3u_url)} style={{ background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', padding:'9px 16px', borderRadius:'var(--radius)', fontSize:13 }}>
                Copy M3U URL
              </button>
              <button onClick={() => copyToClipboard(`Username: ${sub.username}\nPassword: ${sub.password}\nM3U: ${sub.m3u_url}`)} style={{ background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', padding:'9px 16px', borderRadius:'var(--radius)', fontSize:13 }}>
                Copy All Credentials
              </button>
            </div>
          </div>
        )}

        {/* Payment history */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
            <h2 style={{ fontSize:15, fontWeight:700 }}>Payment History</h2>
          </div>
          {orders.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>No payment history yet</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'var(--surface2)' }}>
                {['Plan','Amount','Status','Date'].map(h => (
                  <th key={h} style={{ padding:'10px 20px', textAlign:'left', fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={o.id} style={{ borderTop: i>0?'1px solid var(--border)':'none' }}>
                    <td style={{ padding:'13px 20px' }}>{o.plan_label||'—'}</td>
                    <td style={{ padding:'13px 20px', fontWeight:600, color:'var(--accent)' }}>${(o.amount||0).toFixed(2)}</td>
                    <td style={{ padding:'13px 20px' }}>
                      <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, fontWeight:600, background: o.status==='paid'?'#00d08422':'#e3b34122', color: o.status==='paid'?'var(--accent)':'var(--warn)' }}>{o.status}</span>
                    </td>
                    <td style={{ padding:'13px 20px', color:'var(--muted)', fontSize:13 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
