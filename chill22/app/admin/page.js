'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase-browser';

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '24px', flex: 1, minWidth: 0
    }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState({ clients: 0, todayOrders: 0, todayRevenue: 0, activeSubscriptions: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const sb = createClient();
    const today = new Date(); today.setHours(0,0,0,0);
    const todayISO = today.toISOString();

    const [{ count: clients }, { count: activeSubscriptions }, { data: todayOrdersData }, { data: recent }] = await Promise.all([
      sb.from('clients').select('*', { count: 'exact', head: true }),
      sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('orders').select('amount').gte('created_at', todayISO),
      sb.from('orders').select('*, clients(full_name, email)').order('created_at', { ascending: false }).limit(8),
    ]);

    const todayRevenue = (todayOrdersData || []).reduce((s, o) => s + (o.amount || 0), 0);
    setStats({ clients: clients || 0, todayOrders: (todayOrdersData || []).length, todayRevenue, activeSubscriptions: activeSubscriptions || 0 });
    setRecentOrders(recent || []);
    setLoading(false);
  }

  if (loading) return <div style={{ color: 'var(--muted)', paddingTop: 40 }}>Loading…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Overview</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 13 }}>
        {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Total Clients" value={stats.clients} />
        <StatCard label="Active Subscriptions" value={stats.activeSubscriptions} accent="var(--accent)" />
        <StatCard label="Orders Today" value={stats.todayOrders} />
        <StatCard label="Revenue Today" value={`$${stats.todayRevenue.toFixed(2)}`} accent="var(--accent2)" />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Recent Orders</span>
          <a href="/admin/orders" style={{ fontSize: 12, color: 'var(--accent)' }}>View all →</a>
        </div>
        {recentOrders.length === 0 ? (
          <div style={{ padding: 32, color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>No orders yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Client', 'Plan', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 24px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o, i) => (
                <tr key={o.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 24px' }}>
                    <div style={{ fontWeight: 500 }}>{o.clients?.full_name || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{o.clients?.email}</div>
                  </td>
                  <td style={{ padding: '12px 24px', color: 'var(--muted)' }}>{o.plan_label || '—'}</td>
                  <td style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--accent)' }}>${(o.amount||0).toFixed(2)}</td>
                  <td style={{ padding: '12px 24px' }}>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                      background: o.status === 'paid' ? '#00d08422' : '#e3b34122',
                      color: o.status === 'paid' ? 'var(--accent)' : 'var(--warn)'
                    }}>{o.status}</span>
                  </td>
                  <td style={{ padding: '12px 24px', color: 'var(--muted)', fontSize: 12 }}>
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
