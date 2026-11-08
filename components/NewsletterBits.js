'use client';
import { useEffect, useRef, useState } from 'react';
import { MascotSay } from './Mascot';
import { api } from '@/lib/clientUpload';

export function ConfirmClient({ token, ok, bad }) {
  const [s, setS] = useState('work'), [msg, setMsg] = useState(''); const ran = useRef(false);
  useEffect(() => { if (ran.current) return; ran.current = true; api('/api/newsletter/confirm', { method: 'POST', body: { token } }).then(() => setS('ok')).catch((e) => { setS('bad'); setMsg(e.message); }); }, [token]);
  return s === 'work' ? <MascotSay mood="reading" text="Ένα λεπτό, ελέγχω το γράμμα σου…" />
    : s === 'ok' ? <MascotSay mood="celebrate" text={ok} /> : <MascotSay mood="oops" text={msg || bad} />;
}
export function UnsubClient({ token, bye }) {
  const [s, setS] = useState('ask'), [err, setErr] = useState('');
  const go = async () => { setS('work'); try { await api('/api/newsletter/unsubscribe', { method: 'POST', body: { token } }); setS('done'); } catch (e) { setErr(e.message); setS('ask'); } };
  if (s === 'done') return <MascotSay mood="wave" text={bye} />;
  return (<div><MascotSay mood="confused" text="Θες σίγουρα να φύγεις από το ενημερωτικό δελτίο;" />{err && <p className="err" role="alert">{err}</p>}
    <div className="btns center"><button type="button" className="btn btn-danger" onClick={go} disabled={s === 'work'}>{s === 'work' ? 'Διαγραφή…' : 'Ναι, διαγραφή από τη λίστα'}</button><a className="btn btn-ghost" href="/">Όχι, μένω!</a></div></div>);
}
