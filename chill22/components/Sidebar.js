'use client';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase-browser';

const nav = [
  { label: 'Overview',    icon: '◈', href: '/admin' },
  { label: 'AI Assistant',icon: '✦', href: '/admin/ai' },
  { label: 'Clients',     icon: '◉', href: '/admin/clients' },
  { label: 'Orders',      icon: '◎', href: '/admin/orders' },
  { label: 'P&L',         icon: '◐', href: '/admin/pnl' },
  { label: 'Settings',    icon: '◌', href: '/admin/settings' },
];

export default function Sidebar({ open = false, onClose = () => {} }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push('/login');
  }

  return (
    <>
    {/* Backdrop: mobile only, while the drawer is open */}
    <div
      onClick={onClose}
      aria-hidden="true"
      className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 md:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    />
    {/* Slide-in drawer on mobile, fixed sidebar from md up */}
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col overflow-y-auto transition-transform duration-200 ease-out md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '24px 0' }}
    >
      <div className="flex items-start justify-between" style={{ padding: '0 20px 28px' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
            ProMax<span style={{ color: 'var(--text)' }}> IPTV</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Admin Dashboard</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-8 w-8 items-center justify-center text-base leading-none md:hidden"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          ✕
        </button>
      </div>

      <nav style={{ flex: 1 }}>
        {nav.map(({ label, icon, href }) => {
          const active = path === href || (href !== '/admin' && path.startsWith(href));
          return (
            <a key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', color: active ? 'var(--accent)' : 'var(--muted)',
              background: active ? 'var(--accent-dim)' : 'transparent',
              borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: 13, fontWeight: active ? 600 : 400,
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 15 }}>{icon}</span> {label}
            </a>
          );
        })}
      </nav>

      <div style={{ padding: '0 20px' }}>
        <button onClick={logout} style={{
          width: '100%', padding: '9px', background: 'var(--surface2)',
          color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          fontSize: 13
        }}>Sign out</button>
      </div>
    </aside>
    </>
  );
}
