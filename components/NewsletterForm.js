'use client';
import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { MascotSay } from './Mascot';
import Turnstile from './play/Turnstile';
import { api } from '@/lib/clientUpload';

/** Φόρμα εγγραφής στο ενημερωτικό δελτίο (διπλή επιβεβαίωση με email). Χρησιμοποιείται στο υποσέλιδο, σε ενότητες, στη σελίδα /newsletter και στη σελίδα συντήρησης. */
export default function NewsletterForm({ title, text, button = 'Εγγραφή', placeholder = 'το email σου', thanks, compact = false, dark = false, id }) {
  const uid = useId(), [email, setEmail] = useState(''), [hp, setHp] = useState(''), [cf, setCf] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const t0 = useRef(Date.now()), siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/newsletter/subscribe', { method: 'POST', body: { email, website: hp, cf, t: Date.now() - t0.current } }); setDone(true); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const cls = `nl${dark ? ' on-dark' : ''}${compact ? ' compact' : ''}`;
  if (done) return <div id={id} className={cls}><MascotSay mood="celebrate" text={thanks || 'Σου έστειλα γράμμα! Πάτα τον σύνδεσμο μέσα για να ολοκληρωθεί η εγγραφή.'} size={compact ? 70 : 100} /></div>;
  return (
    <form id={id} className={cls} onSubmit={submit} aria-label="Εγγραφή στο ενημερωτικό δελτίο">
      {title && <h2 className="h3">{title}</h2>}{text && <p className="nl-text">{text}</p>}
      <div className="nl-row"><label className="sr-only" htmlFor={uid}>Email</label>
        <input id={uid} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={placeholder} required autoComplete="email" />
        <button className="btn btn-primary" disabled={busy || (!!siteKey && !cf)}>{busy ? 'Αποστολή…' : button}</button></div>
      <div className="hp" aria-hidden="true"><label>Μην συμπληρώσεις αυτό το πεδίο<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label></div>
      <Turnstile siteKey={siteKey} onToken={setCf} />
      {err && <p className="err" role="alert">{err}</p>}
      <p className="nl-small">Με την εγγραφή αποδέχεσαι το <Link href="/privacy">απόρρητο</Link>. Μπορείς να διαγραφείς όποτε θέλεις.</p>
    </form>
  );
}
