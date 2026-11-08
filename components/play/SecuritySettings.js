'use client';
import { useEffect, useState } from 'react';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';
import { fmtDate } from '@/lib/util';

/** Ασφάλεια λογαριασμού μαθητή: επαλήθευση δύο βημάτων (εφαρμογή στο κινητό) και αξιόπιστες συσκευές. */
export default function SecuritySettings() {
  const [me, setMe] = useState(null), [devs, setDevs] = useState([]), [step, setStep] = useState('idle'), [pw, setPw] = useState(''), [code, setCode] = useState(''), [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null), [saved, setSaved] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [rec, setRec] = useState(false);
  const loadDevs = () => api('/api/account/devices').then(setDevs).catch(() => {});
  useEffect(() => { api('/api/account/me').then(setMe).catch((e) => setErr(e.message)); loadDevs(); }, []);
  const run = async (fn) => { setBusy(true); setErr(''); try { await fn(); } catch (e) { setErr(e.message); } setBusy(false); };
  const start = (e) => { e.preventDefault(); run(async () => { setSetup(await api('/api/account/2fa/setup', { method: 'POST', body: { password: pw } })); setPw(''); setStep('scan'); }); };
  const enable = (e) => { e.preventDefault(); run(async () => { const r = await api('/api/account/2fa/enable', { method: 'POST', body: { code } }); setCodes(r.recoveryCodes); setSetup(null); setCode(''); setStep('codes'); setMe({ ...me, totp_enabled: true }); }); };
  const disable = (e) => { e.preventDefault(); run(async () => { await api('/api/account/2fa/disable', { method: 'POST', body: rec ? { password: pw, recovery: code } : { password: pw, code } }); setPw(''); setCode(''); setStep('idle'); setMe({ ...me, totp_enabled: false }); }); };
  const revoke = async (b) => { await api('/api/account/devices', { method: 'POST', body: b }); loadDevs(); };
  if (!me) return <section className="card sec-wide"><p className="muted">{err || 'Φόρτωση…'}</p></section>;
  const Err = () => (err ? <p className="err" role="alert">{err}</p> : null);
  return (
    <section className="card sec-wide"><h2 className="h3">🔐 Ασφάλεια</h2>
      {step === 'codes' ? (<div className="center"><Mascot mood="celebrate" size={90} /><h3>Οι κωδικοί ανάκτησης</h3><p>Φύλαξέ τους σε ασφαλές μέρος. <b>Εμφανίζονται μόνο τώρα</b> και ο καθένας δουλεύει μία φορά, αν χάσεις το κινητό σου.</p>
        <ul className="codes">{codes.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
        <label className="chk"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> Τους αποθήκευσα σε ασφαλές μέρος.</label>
        <button type="button" className="btn btn-primary sm" disabled={!saved} onClick={() => { setCodes(null); setStep('idle'); }}>Ολοκλήρωση</button></div>)
      : step === 'scan' && setup ? (<div><ol className="steps"><li>Άνοιξε μια εφαρμογή επαλήθευσης (Google Authenticator, Microsoft Authenticator, Authy…).</li><li>Σκάναρε τον κωδικό QR ή γράψε το μυστικό χειροκίνητα.</li><li>Γράψε τον κωδικό 6 ψηφίων που εμφανίζει η εφαρμογή.</li></ol>
        <div className="qrbox"><img src={setup.qr} alt="Κωδικός QR για την εφαρμογή επαλήθευσης" width="220" height="220" /><div><p className="muted">Χειροκίνητη εισαγωγή:</p><code className="secret">{setup.secret.match(/.{1,4}/g).join(' ')}</code></div></div>
        <form onSubmit={enable} className="stack-form"><div className="fld"><label htmlFor="s2c">Κωδικός επαλήθευσης</label><input id="s2c" inputMode="numeric" maxLength={7} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required /></div><Err />
          <div className="btns"><button className="btn btn-primary sm" disabled={busy}>Επαλήθευση και ενεργοποίηση</button><button type="button" className="btn btn-ghost sm" onClick={() => { setStep('idle'); setSetup(null); }}>Άκυρο</button></div></form></div>)
      : me.totp_enabled ? (<div><p>Επαλήθευση δύο βημάτων: <span className="pill published">Ενεργή</span> Κάθε σύνδεση ζητά και κωδικό από το κινητό σου.</p>
        {step !== 'off' ? <button type="button" className="btn btn-danger sm" onClick={() => { setStep('off'); setErr(''); }}>Απενεργοποίηση…</button> : (
          <form onSubmit={disable} className="stack-form"><p className="muted">Χρειάζονται ο κωδικός σου <b>και</b> έγκυρος κωδικός επαλήθευσης.</p>
            <div className="fld"><label htmlFor="dpw">Κωδικός πρόσβασης</label><input id="dpw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
            <div className="fld"><label htmlFor="dcd">{rec ? 'Κωδικός ανάκτησης' : 'Κωδικός 6 ψηφίων'}</label><input id="dcd" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
            <button type="button" className="linkbtn" onClick={() => setRec(!rec)}>{rec ? 'Χρήση κωδικού εφαρμογής' : 'Χρήση κωδικού ανάκτησης'}</button><Err />
            <div className="btns"><button className="btn btn-danger sm" disabled={busy}>Απενεργοποίηση 2FA</button><button type="button" className="btn btn-ghost sm" onClick={() => setStep('idle')}>Άκυρο</button></div></form>)}</div>)
      : (<div><p>Επαλήθευση δύο βημάτων: <span className="pill draft">Ανενεργή</span> Πρόσθεσε ένα δεύτερο βήμα: ακόμα κι αν μάθει κάποιος τον κωδικό σου, δεν θα μπορεί να μπει χωρίς το κινητό σου.</p>
        {step !== 'pw' ? <button type="button" className="btn btn-primary sm" onClick={() => setStep('pw')}>Ενεργοποίηση</button> : (
          <form onSubmit={start} className="stack-form"><div className="fld"><label htmlFor="spw">Επιβεβαίωσε τον κωδικό σου</label><input id="spw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div><Err />
            <div className="btns"><button className="btn btn-primary sm" disabled={busy}>Συνέχεια</button><button type="button" className="btn btn-ghost sm" onClick={() => setStep('idle')}>Άκυρο</button></div></form>)}</div>)}
      <h3 className="h3 mt">Αξιόπιστες συσκευές</h3>
      <p className="muted small">Σε μια νέα συσκευή ζητάμε κωδικό μίας χρήσης στο email σου. Εδώ βλέπεις τις συσκευές που έχεις ήδη επιβεβαιώσει.</p>
      {!devs.length ? <p className="muted">Καμία αξιόπιστη συσκευή.</p> : <ul className="plain">{devs.map((d) => <li key={d.id} className="devrow"><span>💻 <b>{d.label || 'Συσκευή'}</b> <small className="muted">· τελευταία χρήση {fmtDate(d.last_seen)}</small></span><button type="button" className="btn btn-ghost sm" onClick={() => revoke({ id: d.id })}>Αφαίρεση</button></li>)}</ul>}
      {devs.length > 0 && <button type="button" className="btn btn-ghost sm" onClick={() => revoke({ all: true })}>Αφαίρεση όλων</button>}
    </section>
  );
}
