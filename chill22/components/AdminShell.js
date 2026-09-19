'use client';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';

export default function AdminShell({ children }) {
  const [open, setOpen] = useState(false);

  // While the mobile drawer is open: lock page scroll and let Escape close it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="min-w-0 md:ml-[220px]">
        {/* Mobile top bar (hidden from md up, where the sidebar is always visible) */}
        <header
          className="sticky top-0 z-30 flex h-14 items-center gap-3 px-4 md:hidden"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center text-xl leading-none"
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            ☰
          </button>
          <div className="text-[17px] font-bold" style={{ color: 'var(--accent)', letterSpacing: '-0.5px' }}>
            ProMax<span style={{ color: 'var(--text)' }}> IPTV</span>
          </div>
        </header>

        <main className="min-h-[calc(100dvh-56px)] min-w-0 p-4 sm:p-6 md:min-h-screen md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
