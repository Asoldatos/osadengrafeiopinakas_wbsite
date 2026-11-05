'use client';
import { useEffect, useState } from 'react';
import { api, toast } from '@/lib/clientUpload';
import { Field } from './Fields';

const TABS = [['identity', 'Ταυτότητα'], ['design', 'Χρώματα και γραμματοσειρές'], ['nav', 'Μενού'], ['footer', 'Υποσέλιδο'], ['announce', 'Ανακοίνωση'], ['mascot', 'Κιμωλάκης'], ['maint', 'Συντήρηση']];
const COLORS = { paper: 'Χαρτί (φόντο)', paper2: 'Χαρτί 2 (πιο σκούρο)', ink: 'Μελάνι (κείμενο)', board: 'Πίνακας (πράσινο)', c1: 'Κυανό', c2: 'Κόκκινο', c3: 'Κίτρινο', c4: 'Μοβ', c5: 'Μπλε', c6: 'Πορτοκαλί' };
const FONTS = [{ v: 'comfortaa', l: 'Comfortaa – στρογγυλή, παιχνιδιάρικη' }, { v: 'literata', l: 'Literata – σειρήτ, για ανάγνωση' }, { v: 'manrope', l: 'Manrope – σύγχρονη, καθαρή' }];
const MSGS = { empty: 'Κενή κατάσταση (γενικά)', noResults: 'Αναζήτηση χωρίς αποτελέσματα', loading: 'Φόρτωση', error: 'Σφάλμα', notFound: 'Η σελίδα δεν βρέθηκε (404)', maintenance: 'Συντήρηση', login: 'Σελίδα σύνδεσης', twofa: 'Ρύθμιση 2FA', twofaDone: 'Επιτυχής ενεργοποίηση 2FA', published: 'Επιτυχής δημοσίευση', saved: 'Αποθήκευση', upload: 'Μεταφόρτωση αρχείων', adminTip: 'Συμβουλή στον πίνακα διαχείρισης', editions: 'Κανένα τεύχος ακόμα', articles: 'Κανένα άρθρο ακόμα', team: 'Καμία ομάδα ακόμα' };
const setIn = (o, path, v) => { const [k, ...r] = path; return { ...o, [k]: r.length ? setIn(o?.[k] || {}, r, v) : v }; };

export default function SettingsForm() {
  const [s, setS] = useState(null), [tab, setTab] = useState('identity'), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  useEffect(() => { api('/api/admin/settings').then(setS).catch((e) => toast(e.message, 'oops')); }, []);
  useEffect(() => { const f = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', f); return () => window.removeEventListener('beforeunload', f); }, [dirty]);
  if (!s) return <p className="muted">Φόρτωση…</p>;
  const set = (path, v) => { setS((x) => setIn(x, path.split('.'), v)); setDirty(true); };
  const list = (path, fn) => set(path, fn([...(path.split('.').reduce((o, k) => o?.[k], s) || [])]));
  const save = async () => { setBusy(true); try { await api('/api/admin/settings', { method: 'PUT', body: s }); setDirty(false); toast('Οι ρυθμίσεις αποθηκεύτηκαν και εφαρμόστηκαν σε όλο τον ιστότοπο!', 'celebrate'); } catch (e) { toast(e.message, 'oops'); } setBusy(false); };
  const T = (path, label, t = 'text', extra = {}) => <Field f={{ k: path, label, t, ...extra }} value={path.split('.').reduce((o, k) => o?.[k], s)} onChange={(v) => set(path, v)} />;
  return (
    <div>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}<span className="grow" />
        <button type="button" className="btn btn-primary sm" onClick={save} disabled={busy}>{busy ? 'Αποθήκευση…' : dirty ? 'Αποθήκευση αλλαγών •' : 'Αποθήκευση'}</button></div>
      <div className="card form-card">
        {tab === 'identity' && <>{T('name', 'Όνομα ιστοτόπου')}{T('tagline', 'Σύνθημα (tagline)')}{T('description', 'Περιγραφή (SEO / κοινοποιήσεις)', 'area')}
          {T('logoUrl', 'Λογότυπο (διαφανές) – μενού, υποσέλιδο, hero', 'image')}{T('logoBgUrl', 'Λογότυπο με φόντο (πίνακας)', 'image')}
          {T('faviconUrl', 'Favicon', 'image', { hint: 'Αρχικά είναι το επίσημο αρχείο favicon του σχολείου.' })}{T('ogImage', 'Εικόνα κοινοποίησης (Open Graph)', 'image')}</>}
        {tab === 'design' && <><h3>Χρώματα</h3><div className="grid2">{Object.entries(COLORS).map(([k, l]) => T(`colors.${k}`, l, 'color'))}</div>
          <h3>Γραμματοσειρές</h3>{T('fonts.heading', 'Τίτλοι', 'select', { opts: FONTS })}{T('fonts.body', 'Κείμενο άρθρων', 'select', { opts: FONTS })}<p className="muted small">Όλες οι γραμματοσειρές υποστηρίζουν πλήρως τα ελληνικά, με τόνους και διαλυτικά.</p></>}
        {tab === 'nav' && <><p className="muted">Τα κείμενα, οι προορισμοί και η ορατότητα των στοιχείων του κύριου μενού.</p>
          {(s.nav || []).map((n, i) => (
            <div key={i} className="navrow">
              <input aria-label="Ετικέτα" value={n.label} onChange={(e) => list('nav', (l) => { l[i] = { ...n, label: e.target.value }; return l; })} />
              <input aria-label="Προορισμός" value={n.href} onChange={(e) => list('nav', (l) => { l[i] = { ...n, href: e.target.value }; return l; })} />
              <label className="chk"><input type="checkbox" checked={n.visible !== false} onChange={(e) => list('nav', (l) => { l[i] = { ...n, visible: e.target.checked }; return l; })} /> Ορατό</label>
              <button type="button" className="icon-btn sm" aria-label="Πάνω" disabled={i === 0} onClick={() => list('nav', (l) => { [l[i - 1], l[i]] = [l[i], l[i - 1]]; return l; })}>↑</button>
              <button type="button" className="icon-btn sm" aria-label="Κάτω" disabled={i === s.nav.length - 1} onClick={() => list('nav', (l) => { [l[i + 1], l[i]] = [l[i], l[i + 1]]; return l; })}>↓</button>
              <button type="button" className="icon-btn sm" aria-label="Διαγραφή" onClick={() => list('nav', (l) => l.filter((_, j) => j !== i))}>🗑</button>
            </div>))}
          <button type="button" className="btn btn-ghost sm" onClick={() => list('nav', (l) => [...l, { label: 'Νέο στοιχείο', href: '/', visible: true }])}>+ Προσθήκη στοιχείου</button></>}
        {tab === 'footer' && <>{T('footer.about', 'Κείμενο υποσέλιδου', 'area')}{T('footer.linksTitle', 'Τίτλος στήλης πλοήγησης')}{T('footer.contactTitle', 'Τίτλος στήλης επικοινωνίας')}
          {T('footer.contact.email', 'Email')}{T('footer.contact.phone', 'Τηλέφωνο')}{T('footer.contact.address', 'Διεύθυνση')}{T('footer.copyright', 'Κείμενο πνευματικών δικαιωμάτων')}
          <h3>Σύνδεσμοι κοινωνικών δικτύων</h3>
          {(s.footer?.social || []).map((n, i) => (<div key={i} className="navrow"><input aria-label="Όνομα" placeholder="π.χ. Instagram" value={n.label} onChange={(e) => list('footer.social', (l) => { l[i] = { ...n, label: e.target.value }; return l; })} />
            <input aria-label="Διεύθυνση" placeholder="https://…" value={n.url} onChange={(e) => list('footer.social', (l) => { l[i] = { ...n, url: e.target.value }; return l; })} />
            <button type="button" className="icon-btn sm" aria-label="Διαγραφή" onClick={() => list('footer.social', (l) => l.filter((_, j) => j !== i))}>🗑</button></div>))}
          <button type="button" className="btn btn-ghost sm" onClick={() => list('footer.social', (l) => [...l, { label: '', url: '' }])}>+ Προσθήκη συνδέσμου</button></>}
        {tab === 'announce' && <>{T('announcement.enabled', 'Εμφάνιση ανακοίνωσης στην κορυφή όλων των σελίδων', 'bool')}{T('announcement.text', 'Κείμενο')}{T('announcement.link', 'Σύνδεσμος (προαιρετικός)')}</>}
        {tab === 'mascot' && <>{T('mascot.enabled', 'Εμφάνιση του Κιμωλάκη στον ιστότοπο', 'bool')}<p className="muted">Τα μηνύματα που λέει ο Κιμωλάκης σε κάθε περίσταση.</p>{Object.entries(MSGS).map(([k, l]) => T(`mascot.messages.${k}`, l, 'area', { rows: 2 }))}</>}
        {tab === 'maint' && <>{T('maintenance.enabled', 'Ενεργοποίηση λειτουργίας συντήρησης', 'bool', { hint: 'Οι επισκέπτες θα βλέπουν μόνο τη σελίδα συντήρησης. Οι διαχειριστές εξακολουθούν να βλέπουν τον ιστότοπο.' })}
          {T('maintenance.title', 'Τίτλος')}{T('maintenance.message', 'Μήνυμα', 'area')}{T('maintenance.imageUrl', 'Εικόνα (αν μείνει κενή εμφανίζεται ο Κιμωλάκης με κράνος)', 'image')}</>}
      </div>
    </div>
  );
}
