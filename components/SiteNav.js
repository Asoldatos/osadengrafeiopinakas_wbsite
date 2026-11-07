'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import SoundToggle from './SoundToggle';
import Media from './Media';
import Mascot from './Mascot';
import { safeUrl } from '@/lib/util';

export default function SiteNav({ name, logoUrl, items, student }) {
  const path = usePathname(); const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const active = (h) => (h === '/' ? path === '/' : path === h || path.startsWith(h + '/'));
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand" aria-label={`${name} – αρχική σελίδα`}>{logoUrl && <Media src={logoUrl} alt="" width="130" height="48" loading="eager" />}</Link>
        <nav id="mainnav" className={open ? 'open' : ''} aria-label="Κύρια πλοήγηση">
          <ul>{items.map((n, i) => <li key={i}><Link href={safeUrl(n.href)} aria-current={active(n.href) ? 'page' : undefined} className={active(n.href) ? 'on' : ''}>{n.label}</Link></li>)}</ul>
        </nav>
        {student ? <Link href="/account" className="acct" aria-label={`Ο λογαριασμός μου: ${student.nickname}, επίπεδο ${student.level}`}><Mascot mood={student.avatar} size={28} /><span className="acct-t">{student.nickname}<small>Επ. {student.level}</small></span></Link>
          : <Link href="/account/login" className="btn btn-primary sm acct-login">Σύνδεση</Link>}
        <SoundToggle />
        <button type="button" className="burger" aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen(!open)}><span className="sr-only">{open ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}</span><i /><i /><i /></button>
      </div>
    </header>
  );
}
