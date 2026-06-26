'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../../lib/supabase-browser';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', packageId: '16', note: '', country: '' });
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const sb = createClient();
    const { data } = await sb.from('clients').select('*, subscriptions(status, end_date, username, package_id)').order('created_at', { ascending: false });
    setClients(data || []);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true); setResult(null);
    const res = await fetch('/api/admin/create-client', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: form.fullName, email: form.email, pack: form.packageId, note: form.note, country: form.country }) });
    const data = await res.json();
    setCreating(false);
    if (data.error) { setResult({ ok: false, msg: data.error }); }
    else { setResult({ ok: true, msg: `✅ Created: ${data.username}` }); setShowAdd(false); setForm({ fullName:'', email:'', packageId:'16', note:'', country:'' }); loadClients(); }
  }

  const filtered = clients.filter(c => !search || c.email?.toLowerCase().includes(search.toLowerCase()) || c.full_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Clients</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{clients.length} total clients</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, padding: '10px 18px', borderRadius: 'var(--radius)' }}>
          + New Client
        </button>
      </div>

      {showAdd && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Add New Client</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input placeholder="Full Name" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
            <input placeholder="Email *" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input placeholder="Package ID (default: 16)" value={form.packageId} onChange={e => setForm({...form, packageId: e.target.value})} />
            <input placeholder="Country code (e.g. MA)" value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
            <input placeholder="Note (optional)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={{ gridColumn: '1/-1' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={handleCreate} disabled={creating || !form.email} style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, padding: '10px 20px', borderRadius: 'var(--radius)' }}>
              {creating ? 'Creating…' : 'Create & Send Email'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '10px 20px', borderRadius: 'var(--radius)' }}>Cancel</button>
          </div>
          {result && <p style={{ marginTop: 12, color: result.ok ? 'var(--accent)' : 'var(--danger)', fontSize: 13 }}>{result.msg}</p>}
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        </div>
        {loading ? <div style={{ padding: 32, color: 'var(--muted)', textAlign: 'center' }}>Loading…</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Client', 'Username', 'Status', 'Expiry', 'Package'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const sub = c.subscriptions?.[0];
                return (
                  <tr key={c.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 500 }}>{c.full_name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.email}</div>
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: 13, color: 'var(--accent2)' }}>{sub?.username || '—'}</td>
                    <td style={{ padding: '14px 20px' }}>
                      {sub ? (
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: sub.status === 'active' ? '#00d08422' : '#f8514922', color: sub.status === 'active' ? 'var(--accent)' : 'var(--danger)' }}>
                          {sub.status}
                        </span>
                      ) : <span style={{ color: 'var(--muted)', fontSize: 12 }}>No sub</span>}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--muted)', fontSize: 13 }}>{sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '14px 20px', color: 'var(--muted)', fontSize: 13 }}>{sub?.package_id || '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>No clients found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
