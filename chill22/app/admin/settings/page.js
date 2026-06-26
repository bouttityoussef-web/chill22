'use client';
import { useState } from 'react';

export default function SettingsPage() {
  const [baseHostUrl, setBaseHostUrl] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setResult(null);
    const res = await fetch('/api/admin/update-host', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ baseHostUrl, portalUrl }) });
    const data = await res.json();
    setSaving(false);
    setResult(data.error ? { ok:false, msg:data.error } : { ok:true, msg:'Host config updated for all clients.' });
  }

  return (
    <div style={{ maxWidth: 540 }}>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Settings</h1>
      <p style={{ color:'var(--muted)', fontSize:13, marginBottom:28 }}>Configure your panel host URLs</p>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:24 }}>
        <h3 style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Host Configuration</h3>
        <p style={{ color:'var(--muted)', fontSize:12, marginBottom:20 }}>Changing these updates every client dashboard instantly — no need to re-email clients.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Base Host URL</label>
            <input value={baseHostUrl} onChange={e => setBaseHostUrl(e.target.value)} placeholder="http://yourserver.com" />
          </div>
          <div>
            <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Portal URL</label>
            <input value={portalUrl} onChange={e => setPortalUrl(e.target.value)} placeholder="http://yourserver.com/portal" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ marginTop:20, background:'var(--accent)', color:'#000', fontWeight:700, padding:'10px 22px', borderRadius:'var(--radius)' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {result && <p style={{ marginTop:12, fontSize:13, color: result.ok?'var(--accent)':'var(--danger)' }}>{result.msg}</p>}
      </div>
    </div>
  );
}
