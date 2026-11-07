'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MascotSay } from '../Mascot';
import { api } from '@/lib/clientUpload';

export default function Login({ name }) {
  const r = useRouter(); const [step, setStep] = useState('creds'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [code, setCode] = useState(''), [rec, setRec] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const done = () => { r.replace('/editor-panel'); r.refresh(); };
  const creds = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { const j = await api('/api/auth/login', { method: 'POST', body: { email, password: pw } }); j.need2fa ? setStep('code') : done(); } catch (x) { setErr(x.message); } setBusy(false); };
  const second = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/api/auth/2fa', { method: 'POST', body: rec ? { recovery: code } : { code } }); done(); } catch (x) { setErr(x.message); } setBusy(false); };
  return (
    <main className="login board" id="main"><div className="login-card">
      <MascotSay mood={step === 'code' ? 'phone' : 'wave'} k={step === 'code' ? 'twofa' : 'login'} size={110} />
      <h1>{name}</h1><p className="muted">Σύνδεση στον πίνακα διαχείρισης</p>
      {step === 'creds' ? (
        <form onSubmit={creds} className="stack-form">
          <div className="fld"><label htmlFor="em">Email</label><input id="em" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
          <div className="fld"><label htmlFor="pw">Κωδικός πρόσβασης</label><input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
          {err && <p className="err" role="alert">{err}</p>}<button className="btn btn-primary block" disabled={busy}>{busy ? 'Σύνδεση…' : 'Σύνδεση'}</button>
          <Link className="linkbtn forgot-link" href="/editor-panel/forgot">Ξέχασες τον κωδικό σου;</Link></form>
      ) : (
        <form onSubmit={second} className="stack-form"><div className="fld"><label htmlFor="cd">{rec ? 'Κωδικός ανάκτησης' : 'Κωδικός επαλήθευσης (6 ψηφία)'}</label>
          <input id="cd" inputMode={rec ? 'text' : 'numeric'} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus /></div>
          <button type="button" className="linkbtn" onClick={() => { setRec(!rec); setCode(''); }}>{rec ? 'Χρήση κωδικού από την εφαρμογή' : 'Έχασα το κινητό μου – χρήση κωδικού ανάκτησης'}</button>
          {err && <p className="err" role="alert">{err}</p>}<button className="btn btn-primary block" disabled={busy}>{busy ? 'Έλεγχος…' : 'Επαλήθευση'}</button></form>)}
    </div></main>
  );
}
