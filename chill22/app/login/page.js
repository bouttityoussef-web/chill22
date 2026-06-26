'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) return;
    setError(''); setLoading(true);
    const sb = createClient();
    const { data, error: signInError } = await sb.auth.signInWithPassword({ email, password });
    
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (data?.user?.email === adminEmail) {
      window.location.href = '/admin';
    } else {
      window.location.href = '/dashboard';
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width: 360 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--accent)', letterSpacing:'-0.5px', marginBottom:4 }}>
            ProMax<span style={{ color:'var(--text)' }}> IPTV</span>
          </div>
          <div style={{ fontSize:13, color:'var(--muted)' }}>Sign in to your account</div>
        </div>

        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:28 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Email address</label>
              <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} />
            </div>
            {error && <p style={{ fontSize:12, color:'var(--danger)', background:'#f8514911', padding:'10px 12px', borderRadius:'var(--radius)', border:'1px solid #f8514933' }}>{error}</p>}
            <button onClick={handleLogin} disabled={loading} style={{ background:'var(--accent)', color:'#000', fontWeight:700, padding:'12px', borderRadius:'var(--radius)', fontSize:14, marginTop:4 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'var(--muted)', marginTop:20 }}>
          Need help? Contact <span style={{ color:'var(--accent)' }}>support@promax-iptv.com</span>
        </p>
      </div>
    </div>
  );
}
