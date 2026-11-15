'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MascotSay } from '../Mascot';
import { api, toast } from '@/lib/clientUpload';
import { passwordIssues } from '@/lib/pwrules.mjs';

/** Αλλαγή κωδικού. Με forced=true εμφανίζεται ως ξεχωριστή σελίδα (πρώτη σύνδεση / μετά από επαναφορά). */
export default function ChangePassword({ forced = false, username = '', email = '' }) {
  const r = useRouter();
  const [cur, setCur] = useState(''), [n1, setN1] = useState(''), [n2, setN2] = useState(''), [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const issues = useMemo(() => (n1 ? passwordIssues(n1, { username, email }) : []), [n1, username, email]);
  const strength = !n1 ? 0 : Math.min(4, (n1.length >= 10) + (n1.length >= 14) + (/[^A-Za-z0-9]/.test(n1)) + (/[A-Z]/.test(n1) && /[a-z]/.test(n1)));
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (n1 !== n2) return setErr('Οι δύο νέοι κωδικοί δεν ταιριάζουν.');
    if (issues.length) return setErr(`Ο νέος κωδικός πρέπει να έχει: ${issues.join(', ')}.`);
    setBusy(true);
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { current: cur, next: n1 } });
      toast('Ο κωδικός άλλαξε! Οι άλλες συνδέσεις σου αποσυνδέθηκαν.', 'celebrate');
      setCur(''); setN1(''); setN2('');
      if (forced) { r.replace('/editor-panel'); r.refresh(); }
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const t = show ? 'text' : 'password';
  const form = (
    <form onSubmit={submit} className="stack-form" autoComplete="on">
      <input type="text" name="username" autoComplete="username" value={username || email} readOnly hidden />
      <div className="fld"><label htmlFor="cp0">{forced ? 'Προσωρινός κωδικός (αυτός που σου έδωσαν)' : 'Τρέχων κωδικός'}</label><input id="cp0" type={t} autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required autoFocus={forced} /></div>
      <div className="fld"><label htmlFor="cp1">Νέος κωδικός<small>Τουλάχιστον 10 χαρακτήρες, με γράμματα και αριθμούς. Μην περιέχει το όνομα χρήστη ή το email σου.</small></label><input id="cp1" type={t} autoComplete="new-password" value={n1} onChange={(e) => setN1(e.target.value)} required minLength={10} />
        <div className={`pwmeter s${strength}`} aria-hidden="true"><span /><span /><span /><span /></div>
        {n1 && issues.length > 0 && <small className="err">Λείπουν: {issues.join(', ')}</small>}</div>
      <div className="fld"><label htmlFor="cp2">Επανάληψη νέου κωδικού</label><input id="cp2" type={t} autoComplete="new-password" value={n2} onChange={(e) => setN2(e.target.value)} required /></div>
      <label className="chk"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Εμφάνιση κωδικών</label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn btn-primary block" disabled={busy}>{busy ? 'Αποθήκευση…' : 'Αλλαγή κωδικού'}</button>
    </form>
  );
  if (!forced) return form;
  return (
    <main className="login board" id="main"><div className="login-card">
      <MascotSay mood="work" text="Πρώτα απ' όλα: διάλεξε δικό σου κωδικό! Ο προσωρινός κωδικός λειτουργεί μόνο για αυτό το βήμα." size={110} />
      <h1>Νέος κωδικός</h1><p className="muted">Για την ασφάλειά σου, πρέπει να αλλάξεις τον κωδικό σου πριν συνεχίσεις.</p>
      {form}
      <button type="button" className="linkbtn" onClick={async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); r.replace('/editor-panel/login'); }}>Αποσύνδεση</button>
    </div></main>
  );
}
