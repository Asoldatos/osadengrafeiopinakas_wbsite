'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SoundControls from './audio/SoundControls';
import { ThemeToggle, Lights, useSeasonal, useThemedLogo } from './theme/ThemeRuntime';
import Media from './Media';
import Mascot from './Mascot';
import NavInbox from './community/NavInbox';
import SearchOverlay from './SearchOverlay';
import { safeUrl } from '@/lib/util';

export default function SiteNav({ name, logoUrl, items, student }) {
  const path = usePathname(); const [open, setOpen] = useState(false); const sea = useSeasonal(); const logo = useThemedLogo(logoUrl);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  // Το μενού εμφανίζεται στη σειρά ΜΟΝΟ αν χωράει πραγματικά (ανεξάρτητα από ανάλυση, αριθμό συνδέσμων ή γραμματοσειρά)·
  // αλλιώς γίνεται κουμπί ☰. Μετράμε ένα αόρατο αντίγραφο της λίστας με το φυσικό της πλάτος.
  const bar = useRef(null), brand = useRef(null), tools = useRef(null), meas = useRef(null); const [compact, setCompact] = useState(false);
  const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
  useIso(() => {
    const fit = () => {
      const b = bar.current, m = meas.current; if (!b || !m) return;
      const toolsW = [...(tools.current?.children || [])].filter((el) => !el.classList.contains('burger')).reduce((w, el) => w + el.getBoundingClientRect().width + 8, 0);
      const need = (brand.current?.getBoundingClientRect().width || 0) + m.getBoundingClientRect().width + toolsW + 48;
      setCompact(window.innerWidth < 900 || need > b.clientWidth);
    };
    fit(); const ro = new ResizeObserver(fit); ro.observe(bar.current); if (tools.current) ro.observe(tools.current);
    document.fonts?.ready.then(fit); return () => ro.disconnect();
  }, [items, student]);
  useEffect(() => { if (!compact) setOpen(false); }, [compact]);
  const active = (h) => (h === '/' ? path === '/' : path === h || path.startsWith(h + '/'));
  return (
    <header className={`nav${compact ? ' compact' : ''}`}>
      <div className="wrap nav-in" ref={bar}>
        <Link href="/" className="brand" ref={brand} aria-label={`${name} – αρχική σελίδα`}>{logo && <Media src={logo} alt="" width="130" height="48" loading="eager" />}</Link>
        <nav id="mainnav" className={open ? 'open' : ''} aria-label="Κύρια πλοήγηση">
          <ul>{items.map((n, i) => <li key={i}><Link href={safeUrl(n.href)} aria-current={active(n.href) ? 'page' : undefined} className={active(n.href) ? 'on' : ''}>{n.label}{/^\/play\/?$/.test(n.href || '') && <span className="nav-new" aria-label="νέο παιχνίδι">ΝΕΟ</span>}{n.isNew && <span className="nav-new2" aria-label="νέο">ΝΕΟ</span>}</Link></li>)}</ul>
        </nav>
        <ul className="nav-measure" ref={meas} aria-hidden="true">{items.map((n, i) => <li key={i}><span>{n.label}{n.isNew && <span className="nav-new2">ΝΕΟ</span>}</span></li>)}</ul>
        <div className="nav-tools" ref={tools}>
          <SearchOverlay />
          {student && <NavInbox />}
          {student ? <Link href="/account" className="acct" aria-label={`Ο λογαριασμός μου: ${student.nickname}, επίπεδο ${student.level}`}><Mascot mood={student.avatar} size={28} /><span className="acct-t">{student.nickname}<small>Επ. {student.level}</small></span></Link>
            : <Link href="/account/login" className="btn btn-primary sm acct-login">Σύνδεση</Link>}
          <ThemeToggle />
          <SoundControls showMusic={sea.active} />
          <button type="button" className="burger" aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen(!open)}><span className="sr-only">{open ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}</span><i /><i /><i /></button>
        </div>
      </div>
      <Lights />
    </header>
  );
}
