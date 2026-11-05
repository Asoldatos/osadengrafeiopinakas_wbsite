'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import SoundToggle from './SoundToggle';
import { safeUrl } from '@/lib/util';

export default function SiteNav({ name, logoUrl, items }) {
  const path = usePathname(); const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const active = (h) => (h === '/' ? path === '/' : path === h || path.startsWith(h + '/'));
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand" aria-label={`${name} – αρχική σελίδα`}>{logoUrl && <img src={logoUrl} alt="" width="130" height="48" />}</Link>
        <nav id="mainnav" className={open ? 'open' : ''} aria-label="Κύρια πλοήγηση">
          <ul>{items.map((n, i) => <li key={i}><Link href={safeUrl(n.href)} aria-current={active(n.href) ? 'page' : undefined} className={active(n.href) ? 'on' : ''}>{n.label}</Link></li>)}</ul>
        </nav>
        <SoundToggle />
        <button type="button" className="burger" aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen(!open)}><span className="sr-only">{open ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}</span><i /><i /><i /></button>
      </div>
    </header>
  );
}
