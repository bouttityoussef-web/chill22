'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase-browser';
import AdminShell from '../../components/AdminShell';

export default function AdminLayout({ children }) {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.auth.getUser();
      const admin = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (data?.user?.email === admin) {
        setOk(true);
      } else {
        window.location.href = '/login';
      }
    })();
  }, []);

  if (ok === null) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--muted)', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:20, color:'var(--accent)' }}>✦</div>
      <div>Loading ProMax IPTV…</div>
    </div>
  );

  return <AdminShell>{children}</AdminShell>;
}
