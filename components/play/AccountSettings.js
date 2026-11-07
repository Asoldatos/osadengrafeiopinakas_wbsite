'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';
import { AVATARS } from '@/lib/progress.mjs';

export default function AccountSettings({ nickname, avatar }) {
  const r = useRouter(); const [nick, setNick] = useState(nickname), [av, setAv] = useState(avatar), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const [cur, setCur] = useState(''), [nw, setNw] = useState(''), [del, setDel] = useState(''), [askDel, setAskDel] = useState(false);
  const run = async (fn, ok) => { setErr(''); setMsg(''); try { await fn(); if (ok) setMsg(ok); r.refresh(); } catch (e) { setErr(e.message); } };
  return (
    <div className="acc-settings">
      {msg && <p className="ok" role="status">{msg}</p>}{err && <p className="err" role="alert">{err}</p>}
      <section className="card"><h2 className="h3">Προφίλ</h2>
        <div className="fld"><label htmlFor="an">Όνομα χρήστη</label><input id="an" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={20} /></div>
        <p className="fld-l">Διάλεξε τον Κιμωλάκη σου:</p>
        <div className="avatars" role="radiogroup" aria-label="Avatar">{AVATARS.map((a) => <button key={a} type="button" role="radio" aria-checked={av === a} aria-label={a} className={`avatar-pick${av === a ? ' on' : ''}`} onClick={() => setAv(a)}><Mascot mood={a} size={52} /></button>)}</div>
        <button type="button" className="btn btn-primary sm" onClick={() => run(() => api('/api/account/profile', { method: 'POST', body: { nickname: nick, avatar: av } }), 'Το προφίλ αποθηκεύτηκε!')}>Αποθήκευση προφίλ</button></section>
      <section className="card"><h2 className="h3">Αλλαγή κωδικού</h2>
        <div className="fld"><label htmlFor="cp">Τρέχων κωδικός</label><input id="cp" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
        <div className="fld"><label htmlFor="np">Νέος κωδικός (τουλάχιστον 8 χαρακτήρες)</label><input id="np" type="password" autoComplete="new-password" value={nw} onChange={(e) => setNw(e.target.value)} /></div>
        <button type="button" className="btn btn-primary sm" onClick={() => run(async () => { await api('/api/account/password', { method: 'POST', body: { current: cur, next: nw } }); setCur(''); setNw(''); }, 'Ο κωδικός άλλαξε!')}>Αλλαγή κωδικού</button></section>
      <section className="card"><h2 className="h3">Αποσύνδεση και διαγραφή</h2>
        <div className="btns"><button type="button" className="btn btn-ghost sm" onClick={async () => { await api('/api/account/logout', { method: 'POST' }); r.replace('/'); r.refresh(); }}>Αποσύνδεση</button>
          {!askDel && <button type="button" className="btn btn-danger sm" onClick={() => setAskDel(true)}>Διαγραφή λογαριασμού…</button>}</div>
        {askDel && <div className="danger"><p><b>Η διαγραφή είναι οριστική:</b> χάνονται οι πόντοι, τα παράσημα και η πρόοδός σου.</p>
          <div className="fld"><label htmlFor="dp">Γράψε τον κωδικό σου για επιβεβαίωση</label><input id="dp" type="password" autoComplete="current-password" value={del} onChange={(e) => setDel(e.target.value)} /></div>
          <div className="btns"><button type="button" className="btn btn-danger sm" onClick={() => run(async () => { await api('/api/account/delete', { method: 'POST', body: { password: del } }); r.replace('/'); })}>Διαγραφή οριστικά</button><button type="button" className="btn btn-ghost sm" onClick={() => setAskDel(false)}>Άκυρο</button></div></div>}</section>
    </div>
  );
}
