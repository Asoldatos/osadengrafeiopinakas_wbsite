'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import SoundControls from './audio/SoundControls';
import { ThemeToggle, Lights, useSeasonal, useThemedLogo } from './theme/ThemeRuntime';
import Media from './Media';
import Mascot from './Mascot';
import NavInbox from './community/NavInbox';
import { safeUrl } from '@/lib/util';

export default function SiteNav({ name, logoUrl, items, student }) {
  const path = usePathname(); const [open, setOpen] = useState(false); const sea = useSeasonal(); const logo = useThemedLogo(logoUrl);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const active = (h) => (h === '/' ? path === '/' : path === h || path.startsWith(h + '/'));
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand" aria-label={`${name} – αρχική σελίδα`}>{logo && <Media src={logo} alt="" width="130" height="48" loading="eager" />}</Link>
        <nav id="mainnav" className={open ? 'open' : ''} aria-label="Κύρια πλοήγηση">
          <ul>{items.map((n, i) => <li key={i}><Link href={safeUrl(n.href)} aria-current={active(n.href) ? 'page' : undefined} className={active(n.href) ? 'on' : ''}>{n.label}{/^\/play\/?$/.test(n.href || '') && <span className="nav-new" aria-label="νέο παιχνίδι">ΝΕΟ</span>}</Link></li>)}</ul>
        </nav>
        {student && <NavInbox />}
        {student ? <Link href="/account" className="acct" aria-label={`Ο λογαριασμός μου: ${student.nickname}, επίπεδο ${student.level}`}><Mascot mood={student.avatar} size={28} /><span className="acct-t">{student.nickname}<small>Επ. {student.level}</small></span></Link>
          : <Link href="/account/login" className="btn btn-primary sm acct-login">Σύνδεση</Link>}
        <ThemeToggle />
        <SoundControls showMusic={sea.active} />
        <button type="button" className="burger" aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen(!open)}><span className="sr-only">{open ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}</span><i /><i /><i /></button>
      </div>
      <Lights />
    </header>
  );
}
