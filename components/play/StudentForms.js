'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MascotSay } from '../Mascot';
import Turnstile from './Turnstile';
import { api } from '@/lib/clientUpload';

const safeNext = (n) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/account');
const Card = ({ title, children, mood, text }) => (
  <div className="wrap narrow page-pad"><div className="auth-card"><MascotSay mood={mood} text={text} size={100} /><h1 className="h2">{title}</h1>{children}</div></div>
);

export function RegisterForm({ siteKey, domains }) {
  const [f, setF] = useState({ nickname: '', email: '', password: '', consent: false }), [cf, setCf] = useState(''), [hp, setHp] = useState('');
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [show, setShow] = useState(false);
  const t0 = useRef(Date.now());
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/account/register', { method: 'POST', body: { ...f, website: hp, cf, t: Date.now() - t0.current } }); setSent(true); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  if (sent) return <Card title="Έλεγξε το email σου!" mood="celebrate" text="Σου έστειλα ένα γράμμα! Πάτα τον σύνδεσμο μέσα και είσαι έτοιμος να παίξεις."><p>Αν όλα πήγαν καλά, στείλαμε ένα μήνυμα στο <b>{f.email}</b>. Πάτα τον σύνδεσμο για να επιβεβαιώσεις τον λογαριασμό σου. Κοίταξε και στα ανεπιθύμητα.</p><p><Link className="linkbtn" href="/account/login">Πήγαινε στη σύνδεση</Link></p></Card>;
  return (
    <Card title="Φτιάξε λογαριασμό μαθητή" mood="wave" text="Δωρεάν και σε ένα λεπτό! Ξεκλειδώνεις παιχνίδια, περιπέτειες, πόντους και παράσημα.">
      <ul className="perks"><li>🎮 Επιπλέον παιχνίδια και κουίζ</li><li>🗺️ Περιπέτειες με τον Κιμωλάκη</li><li>🏅 Πόντοι, επίπεδα και παράσημα</li><li>🖨️ Λήψη και εκτύπωση τευχών</li></ul>
      <form onSubmit={submit} className="stack-form">
        <div className="fld"><label htmlFor="rn">Όνομα χρήστη<small>Θα το βλέπουν οι άλλοι μαθητές. Μην βάλεις το πραγματικό σου ονοματεπώνυμο.</small></label><input id="rn" value={f.nickname} onChange={(e) => set('nickname', e.target.value)} required minLength={3} maxLength={20} autoComplete="nickname" /></div>
        <div className="fld"><label htmlFor="re">Email{domains && <small>Επιτρέπονται μόνο email του σχολείου ({domains}).</small>}</label><input id="re" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} required autoComplete="email" /></div>
        <div className="fld"><label htmlFor="rp">Κωδικός (τουλάχιστον 8 χαρακτήρες)</label><div className="pwbox"><input id="rp" type={show ? 'text' : 'password'} value={f.password} onChange={(e) => set('password', e.target.value)} required minLength={8} autoComplete="new-password" />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}>{show ? '🙈' : '👁'}</button></div></div>
        <div className="hp" aria-hidden="true"><label>Μην συμπληρώσεις αυτό το πεδίο<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label></div>
        <label className="chk consent"><input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} required /><span>Έχω διαβάσει τους <Link href="/privacy" target="_blank">όρους και το απόρρητο</Link> και είμαι 15 ετών ή μεγαλύτερος/η ή έχω τη συγκατάθεση γονέα/κηδεμόνα.</span></label>
        <Turnstile siteKey={siteKey} onToken={setCf} />
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn btn-primary block" disabled={busy || (!!siteKey && !cf)}>{busy ? 'Δημιουργία…' : 'Δημιούργησε τον λογαριασμό'}</button>
      </form>
      <p className="muted small center">Έχεις ήδη λογαριασμό; <Link href="/account/login">Σύνδεση</Link></p>
    </Card>
  );
}

export function LoginForm({ next }) {
  const r = useRouter(); const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [unv, setUnv] = useState(false), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(''); setUnv(false); setNote('');
    try { await api('/api/account/login', { method: 'POST', body: { email, password: pw } }); r.replace(safeNext(next)); r.refresh(); }
    catch (x) { setErr(x.message); setUnv(/επιβεβαιώσεις το email/.test(x.message)); }
    setBusy(false);
  };
  const resend = async () => { try { await api('/api/account/resend', { method: 'POST', body: { email } }); setNote('Στείλαμε νέο μήνυμα επιβεβαίωσης!'); } catch (x) { setErr(x.message); } };
  return (
    <Card title="Σύνδεση μαθητή" mood="happy" text="Γεια σου! Δείξε μου ποιος είσαι να συνεχίσουμε το παιχνίδι.">
      <form onSubmit={submit} className="stack-form">
        <div className="fld"><label htmlFor="le">Email</label><input id="le" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus /></div>
        <div className="fld"><label htmlFor="lp">Κωδικός</label><input id="lp" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" /></div>
        {err && <p className="err" role="alert">{err}</p>}{note && <p className="ok" role="status">{note}</p>}
        {unv && <button type="button" className="linkbtn" onClick={resend}>Στείλε ξανά το email επιβεβαίωσης</button>}
        <button className="btn btn-primary block" disabled={busy}>{busy ? 'Σύνδεση…' : 'Σύνδεση'}</button>
      </form>
      <p className="center"><Link className="linkbtn" href="/account/forgot">Ξέχασες τον κωδικό σου;</Link></p>
      <p className="muted small center">Δεν έχεις λογαριασμό; <Link href={`/account/register`}>Φτιάξε έναν δωρεάν</Link></p>
    </Card>
  );
}

export function VerifyClient({ token }) {
  const r = useRouter(); const [state, setState] = useState('work'), [msg, setMsg] = useState(''); const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; ran.current = true;
    api('/api/account/verify', { method: 'POST', body: { token } }).then(() => { setState('ok'); setTimeout(() => { r.replace('/account'); r.refresh(); }, 1800); }).catch((e) => { setState('bad'); setMsg(e.message); });
  }, [token, r]);
  return state === 'work' ? <Card title="Επιβεβαίωση…" mood="reading" text="Ένα λεπτό, ελέγχω το γράμμα σου…" />
    : state === 'ok' ? <Card title="Έτοιμο! 🎉" mood="celebrate" text="Το email σου επιβεβαιώθηκε! Σε πάω στον λογαριασμό σου…" />
    : <Card title="Κάτι δεν πήγε καλά" mood="oops" text={msg}><p><Link className="btn btn-primary block" href="/account/login">Πήγαινε στη σύνδεση</Link></p><p className="muted small center">Από εκεί μπορείς να ζητήσεις νέο email επιβεβαίωσης.</p></Card>;
}

export function ForgotForm({ siteKey }) {
  const [email, setEmail] = useState(''), [cf, setCf] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/api/account/forgot', { method: 'POST', body: { email, cf } }); setSent(true); } catch (x) { setErr(x.message); } setBusy(false); };
  if (sent) return <Card title="Έλεγξε το email σου" mood="celebrate" text="Το γράμμα έφυγε! Κοίταξε και στα ανεπιθύμητα."><p>Αν υπάρχει λογαριασμός με το email <b>{email}</b>, στείλαμε έναν σύνδεσμο που ισχύει για 1 ώρα.</p></Card>;
  return (
    <Card title="Ξέχασες τον κωδικό σου;" mood="confused" text="Δεν πειράζει! Γράψε το email σου και θα σου στείλω έναν σύνδεσμο για νέο κωδικό.">
      <form onSubmit={submit} className="stack-form"><div className="fld"><label htmlFor="fe">Email</label><input id="fe" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
        <Turnstile siteKey={siteKey} onToken={setCf} />{err && <p className="err" role="alert">{err}</p>}
        <button className="btn btn-primary block" disabled={busy || (!!siteKey && !cf)}>{busy ? 'Αποστολή…' : 'Στείλε μου σύνδεσμο'}</button></form>
      <p className="center"><Link className="linkbtn" href="/account/login">← Πίσω στη σύνδεση</Link></p>
    </Card>
  );
}

export function ResetForm({ token }) {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
    if (pw !== pw2) return setErr('Οι δύο κωδικοί δεν ταιριάζουν.');
    setBusy(true); try { await api('/api/account/reset', { method: 'POST', body: { token, password: pw } }); setDone(true); } catch (x) { setErr(x.message); } setBusy(false);
  };
  if (done) return <Card title="Ο κωδικός άλλαξε! 🎉" mood="celebrate" text="Έτοιμο! Μπορείς να συνδεθείς με τον νέο σου κωδικό."><Link className="btn btn-primary block" href="/account/login">Σύνδεση</Link></Card>;
  return (
    <Card title="Νέος κωδικός" mood="happy" text="Διάλεξε έναν νέο κωδικό, τουλάχιστον 8 χαρακτήρες.">
      <form onSubmit={submit} className="stack-form"><div className="fld"><label htmlFor="np">Νέος κωδικός</label><input id="np" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" autoFocus /></div>
        <div className="fld"><label htmlFor="np2">Επανάληψη κωδικού</label><input id="np2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" /></div>
        {err && <p className="err" role="alert">{err}</p>}<button className="btn btn-primary block" disabled={busy}>{busy ? 'Αποθήκευση…' : 'Αλλαγή κωδικού'}</button></form>
    </Card>
  );
}
