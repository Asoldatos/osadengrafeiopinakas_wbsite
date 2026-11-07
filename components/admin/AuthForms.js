'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MascotSay } from '../Mascot';
import { api } from '@/lib/clientUpload';

export function ForgotForm({ name }) {
  const [email, setEmail] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/api/auth/forgot', { method: 'POST', body: { email } }); setSent(true); } catch (x) { setErr(x.message); } setBusy(false); };
  return (
    <main className="login board" id="main"><div className="login-card">
      <MascotSay mood={sent ? 'celebrate' : 'confused'} text={sent ? 'Το γράμμα έφυγε! Έλεγξε το email σου (και τον φάκελο ανεπιθύμητων).' : 'Ξέχασες τον κωδικό σου; Δεν πειράζει, θα στείλουμε ένα μήνυμα να βάλεις νέο!'} size={110} />
      <h1>{sent ? 'Έλεγξε το email σου' : 'Επαναφορά κωδικού'}</h1><p className="muted">{name}</p>
      {sent ? (<><p>Αν υπάρχει λογαριασμός με το email <b>{email}</b>, μόλις στείλαμε έναν σύνδεσμο επαναφοράς. Ισχύει για <b>1 ώρα</b>.</p><p className="muted small">Δεν ήρθε τίποτα σε λίγα λεπτά; Κοίταξε στα ανεπιθύμητα ή δοκίμασε ξανά.</p></>) : (
        <form onSubmit={submit} className="stack-form">
          <div className="fld"><label htmlFor="fe">Το email του λογαριασμού σου</label><input id="fe" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
          {err && <p className="err" role="alert">{err}</p>}<button className="btn btn-primary block" disabled={busy}>{busy ? 'Αποστολή…' : 'Στείλε μου σύνδεσμο'}</button></form>)}
      <Link className="linkbtn forgot-link" href="/editor-panel/login">← Πίσω στη σύνδεση</Link>
    </div></main>
  );
}

export function ResetForm({ token }) {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (pw.length < 10) return setErr('Ο κωδικός πρέπει να έχει τουλάχιστον 10 χαρακτήρες.');
    if (pw !== pw2) return setErr('Οι δύο κωδικοί δεν ταιριάζουν.');
    setBusy(true); try { await api('/api/auth/reset', { method: 'POST', body: { token, password: pw } }); setDone(true); } catch (x) { setErr(x.message); } setBusy(false);
  };
  return (
    <main className="login board" id="main"><div className="login-card">
      <MascotSay mood={done ? 'celebrate' : 'happy'} text={done ? 'Έτοιμο! Ο νέος κωδικός σου δουλεύει. Μπορείς να συνδεθείς.' : 'Διάλεξε έναν νέο κωδικό, τουλάχιστον 10 χαρακτήρες. Καλύτερα να είναι μια φράση!'} size={110} />
      <h1>{done ? 'Ο κωδικός άλλαξε!' : 'Νέος κωδικός'}</h1>
      {done ? <Link className="btn btn-primary block" href="/editor-panel/login">Σύνδεση</Link> : (
        <form onSubmit={submit} className="stack-form">
          <div className="fld"><label htmlFor="np">Νέος κωδικός</label><div className="pwbox"><input id="np" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={10} value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}>{show ? '🙈' : '👁'}</button></div></div>
          <div className="fld"><label htmlFor="np2">Επανάληψη νέου κωδικού</label><input id="np2" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
          {err && <p className="err" role="alert">{err}</p>}<button className="btn btn-primary block" disabled={busy}>{busy ? 'Αποθήκευση…' : 'Αλλαγή κωδικού'}</button></form>)}
    </div></main>
  );
}
