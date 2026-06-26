'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../../lib/supabase-browser';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ client_email: '', plan_label: '', amount: '', status: 'paid', notes: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    const sb = createClient();
    const { data } = await sb.from('orders').select('*, clients(full_name, email)').order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    const sb = createClient();
    const { data: client } = await sb.from('clients').select('id').eq('email', form.client_email).single();
    await sb.from('orders').insert({
      client_id: client?.id || null,
      plan_label: form.plan_label,
      amount: parseFloat(form.amount),
      status: form.status,
      notes: form.notes,
      customer_email: form.client_email,
    });
    setSaving(false); setShowAdd(false);
    setForm({ client_email:'', plan_label:'', amount:'', status:'paid', notes:'' });
    loadOrders();
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const filtered = orders.filter(o => {
    if (filter === 'today') return new Date(o.created_at) >= today;
    if (filter === 'paid') return o.status === 'paid';
    if (filter === 'pending') return o.status === 'pending';
    return true;
  });

  const totalRevenue = filtered.filter(o => o.status === 'paid').reduce((s, o) => s + (o.amount||0), 0);
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const todayRevenue = todayOrders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.amount||0), 0);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Orders</h1>
          <p style={{ color:'var(--muted)', fontSize:13 }}>
            Today: <span style={{ color:'var(--accent)', fontWeight:600 }}>${todayRevenue.toFixed(2)}</span>
            <span style={{ margin:'0 8px', opacity:0.3 }}>|</span>
            Showing: <span style={{ color:'var(--accent2)', fontWeight:600 }}>${totalRevenue.toFixed(2)}</span>
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background:'var(--accent)', color:'#000', fontWeight:700, padding:'10px 18px', borderRadius:'var(--radius)' }}>+ Add Order</button>
      </div>

      {/* Webhook URL info */}
      <div style={{ background:'#58a6ff11', border:'1px solid #58a6ff33', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:20, fontSize:13 }}>
        <span style={{ color:'var(--accent2)', fontWeight:600 }}>⚡ FlujiPay Webhook URL: </span>
        <code style={{ color:'var(--text)', fontSize:12 }}>{typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/flujipay</code>
        <span style={{ color:'var(--muted)', marginLeft:8 }}>— Add this in FlujiPay → Developers → Webhooks</span>
      </div>

      {showAdd && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:24, marginBottom:24 }}>
          <h3 style={{ marginBottom:16, fontSize:15 }}>Record Manual Order</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <input placeholder="Client email" value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})} />
            <input placeholder="Plan label (e.g. 1 Year Premium)" value={form.plan_label} onChange={e => setForm({...form, plan_label: e.target.value})} />
            <input placeholder="Amount (USD)" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ gridColumn:'1/-1' }} />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:14 }}>
            <button onClick={handleAdd} disabled={saving} style={{ background:'var(--accent)', color:'#000', fontWeight:700, padding:'10px 20px', borderRadius:'var(--radius)' }}>{saving ? 'Saving…' : 'Save Order'}</button>
            <button onClick={() => setShowAdd(false)} style={{ background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--muted)', padding:'10px 20px', borderRadius:'var(--radius)' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['all','today','paid','pending'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, background: filter===f?'var(--accent)':'var(--surface2)', color: filter===f?'#000':'var(--muted)', border:'1px solid var(--border)' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)} {f==='today' ? `(${todayOrders.length})` : ''}
          </button>
        ))}
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>Loading…</div> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'var(--surface2)' }}>
              {['Customer','Plan','Amount','Status','Phone','Date'].map(h => (
                <th key={h} style={{ padding:'10px 20px', textAlign:'left', fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={o.id} style={{ borderTop: i>0?'1px solid var(--border)':'none' }}>
                  <td style={{ padding:'13px 20px' }}>
                    <div style={{ fontWeight:500 }}>{o.customer_name || o.clients?.full_name || '—'}</div>
                    <div style={{ fontSize:12, color:'var(--muted)' }}>{o.customer_email || o.clients?.email}</div>
                  </td>
                  <td style={{ padding:'13px 20px', color:'var(--muted)', fontSize:13 }}>{o.plan_label||'—'}</td>
                  <td style={{ padding:'13px 20px', fontWeight:600, color:'var(--accent)' }}>${(o.amount||0).toFixed(2)}</td>
                  <td style={{ padding:'13px 20px' }}>
                    <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, fontWeight:600, background: o.status==='paid'?'#00d08422':'#e3b34122', color: o.status==='paid'?'var(--accent)':'var(--warn)' }}>{o.status}</span>
                  </td>
                  <td style={{ padding:'13px 20px', color:'var(--muted)', fontSize:12 }}>{o.customer_phone||'—'}</td>
                  <td style={{ padding:'13px 20px', color:'var(--muted)', fontSize:12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>No orders yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
