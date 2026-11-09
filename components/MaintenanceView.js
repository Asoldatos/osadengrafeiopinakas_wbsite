'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Mascot from './Mascot';
import Media from './Media';
import NewsletterForm from './NewsletterForm';

const Chalk = () => (
  <svg className="maint-doodles" viewBox="0 0 600 400" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".28">
      <path d="M40 70 l8 18 20 2 -15 13 5 20 -18 -10 -18 10 5 -20 -15 -13 20 -2z" /><path d="M520 60 q15 -25 30 0 t30 0" /><path d="M470 330 l30 -20 M500 310 l-4 22 M500 310 l22 4" />
      <circle cx="110" cy="340" r="14" /><path d="M300 36 q10 -14 20 0 t20 0 t20 0" /><path d="M20 220 q20 -30 40 0" /><path d="M560 200 l12 -12 m0 12 l-12 -12" />
    </g>
  </svg>
);

/** Σελίδα συντήρησης: μενού, φόρμα ενημερωτικού και πλαϊνό πάνελ «Απόρρητο» (το περιεχόμενο μετακινείται ομαλά αριστερά, οι πληροφορίες ανοίγουν δεξιά). */
export default function MaintenanceView({ site, privacy }) {
  const path = usePathname();
  const [open, setOpen] = useState(path === '/privacy' && !!privacy);
  const closeRef = useRef(null), btnRef = useRef(null), first = useRef(true);
  const m = site.maintenance || {}, n = site.newsletter || {};
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (open) closeRef.current?.focus(); else btnRef.current?.focus();
  }, [open]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const toNews = () => { const el = document.getElementById('newsletter'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el?.querySelector('input[type=email]')?.focus({ preventScroll: true }), 450); };
  return (
    <div className={`maint board${open ? ' with-panel' : ''}`}>
      <Chalk />
      <header className="maint-bar"><div className="wrap maint-bar-in">
        {site.logoUrl && <Media src={site.logoUrl} alt={site.name} className="maint-logo" width="130" height="48" loading="eager" />}
        <nav aria-label="Μενού" className="maint-nav">
          {n.enabled !== false && <button type="button" className="btn btn-light sm" aria-label={n.title || 'Ενημερωτικό δελτίο'} onClick={toNews}>💌 <span>{n.title || 'Ενημερωτικό δελτίο'}</span></button>}
          {privacy && <button ref={btnRef} type="button" className="btn btn-light sm" aria-expanded={open} aria-label="Απόρρητο" aria-controls="privacy-panel" onClick={() => setOpen(!open)}>🔒 <span>Απόρρητο</span></button>}
        </nav></div></header>
      <div className="maint-split">
        <main className="maint-main" id="main">
          <div className="maint-hero">
            {m.imageUrl ? <Media src={m.imageUrl} alt="" className="maint-img" /> : <Mascot mood="work" size={190} />}
            <h1 className="h1">{m.title}</h1><p className="lede">{m.message}</p>
            {m.eta && <p className="eta">⏱️ {m.eta}</p>}
          </div>
          {n.enabled !== false && <div className="maint-news"><NewsletterForm id="newsletter" dark title={n.title} text={n.maintenanceText || n.text} button={n.button} placeholder={n.placeholder} thanks={site.thanks} onPrivacy={privacy ? () => setOpen(true) : undefined} /></div>}
        </main>
        {privacy && (
          <aside id="privacy-panel" className="maint-panel" aria-label="Απόρρητο και όροι χρήσης" aria-hidden={!open}>
            <div className="maint-panel-in">
              <button ref={closeRef} type="button" className="modal-x" onClick={() => setOpen(false)} aria-label="Κλείσιμο">✕</button>
              <h2 className="h2">{privacy.title}</h2>{privacy.subtitle && <p className="lede">{privacy.subtitle}</p>}
              <div className="prose" dangerouslySetInnerHTML={{ __html: privacy.html }} />
            </div>
          </aside>)}
      </div>
    </div>
  );
}
