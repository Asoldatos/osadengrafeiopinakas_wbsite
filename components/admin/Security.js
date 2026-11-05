'use client';
import { useEffect, useState } from 'react';
import { api, toast } from '@/lib/clientUpload';
import { MascotSay } from '../Mascot';

export default function Security() {
  const [me, setMe] = useState(null), [step, setStep] = useState('idle'), [pw, setPw] = useState(''), [code, setCode] = useState(''), [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null), [saved, setSaved] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [useRec, setUseRec] = useState(false);
  useEffect(() => { api('/api/auth/me').then(setMe).catch((e) => setErr(e.message)); }, []);
  const run = async (fn) => { setBusy(true); setErr(''); try { await fn(); } catch (e) { setErr(e.message); } setBusy(false); };
  const start = (e) => { e.preventDefault(); run(async () => { setSetup(await api('/api/auth/2fa/setup', { method: 'POST', body: { password: pw } })); setPw(''); setStep('scan'); }); };
  const verify = (e) => { e.preventDefault(); run(async () => { const r = await api('/api/auth/2fa/enable', { method: 'POST', body: { code } }); setCodes(r.recoveryCodes); setSetup(null); setCode(''); setStep('codes'); setMe({ ...me, totp_enabled: true }); }); };
  const disable = (e) => { e.preventDefault(); run(async () => { await api('/api/auth/2fa/disable', { method: 'POST', body: useRec ? { password: pw, recovery: code } : { password: pw, code } }); setPw(''); setCode(''); setStep('idle'); setMe({ ...me, totp_enabled: false }); toast('Η επαλήθευση δύο βημάτων απενεργοποιήθηκε.'); }); };
  const download = () => { const b = new Blob([`Κωδικοί ανάκτησης – Όσα δεν γράφει ο πίνακας\nΚάθε κωδικός ισχύει μία φορά.\n\n${codes.join('\n')}\n`], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'kodikoi-anakthshs.txt'; a.click(); URL.revokeObjectURL(a.href); };
  if (!me) return <p className="muted">{err || 'Φόρτωση…'}</p>;
  const Err = () => err ? <p className="err" role="alert">{err}</p> : null;
  if (step === 'codes') return (
    <div className="card form-card"><MascotSay mood="celebrate" k="twofaDone" />
      <h2>Οι κωδικοί ανάκτησης</h2><p>Φύλαξέ τους σε ασφαλές μέρος. <b>Εμφανίζονται μόνο τώρα</b> και ο καθένας δουλεύει μία φορά, αν χάσεις το κινητό σου.</p>
      <ul className="codes">{codes.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
      <div className="row wrap"><button type="button" className="btn btn-ghost sm" onClick={() => navigator.clipboard.writeText(codes.join('\n')).then(() => toast('Αντιγράφηκαν!'))}>Αντιγραφή</button><button type="button" className="btn btn-ghost sm" onClick={download}>Λήψη αρχείου .txt</button></div>
      <label className="chk"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> Αποθήκευσα τους κωδικούς σε ασφαλές μέρος.</label>
      <button type="button" className="btn btn-primary" disabled={!saved} onClick={() => { setCodes(null); setStep('idle'); }}>Ολοκλήρωση</button></div>);
  if (me.totp_enabled) return (
    <div className="card form-card"><h2>Επαλήθευση δύο βημάτων: <span className="pill published">Ενεργή</span></h2>
      <p>Κάθε σύνδεση απαιτεί και έναν κωδικό από την εφαρμογή επαλήθευσης του κινητού σου.</p>
      {step !== 'off' ? <button type="button" className="btn btn-danger sm" onClick={() => { setStep('off'); setErr(''); }}>Απενεργοποίηση…</button> : (
        <form onSubmit={disable} className="stack-form"><p className="muted">Για ασφάλεια, χρειάζονται ο κωδικός πρόσβασής σου <b>και</b> έγκυρος κωδικός επαλήθευσης.</p>
          <div className="fld"><label htmlFor="dp">Κωδικός πρόσβασης</label><input id="dp" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
          <div className="fld"><label htmlFor="dc">{useRec ? 'Κωδικός ανάκτησης' : 'Κωδικός 6 ψηφίων'}</label><input id="dc" inputMode={useRec ? 'text' : 'numeric'} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
          <button type="button" className="linkbtn" onClick={() => setUseRec(!useRec)}>{useRec ? 'Χρήση κωδικού από την εφαρμογή' : 'Χρήση κωδικού ανάκτησης'}</button><Err />
          <div className="row"><button className="btn btn-danger" disabled={busy}>Απενεργοποίηση 2FA</button><button type="button" className="btn btn-ghost" onClick={() => setStep('idle')}>Άκυρο</button></div></form>)}</div>);
  if (step === 'scan' && setup) return (
    <div className="card form-card"><MascotSay mood="phone" k="twofa" />
      <ol className="steps"><li><b>Άνοιξε</b> μια εφαρμογή επαλήθευσης (Google Authenticator, Microsoft Authenticator, Authy…).</li><li><b>Σκάναρε</b> τον κωδικό QR ή πληκτρολόγησε το μυστικό χειροκίνητα.</li><li><b>Γράψε</b> τον κωδικό 6 ψηφίων που εμφανίζει η εφαρμογή.</li></ol>
      <div className="qrbox"><img src={setup.qr} alt="Κωδικός QR για την εφαρμογή επαλήθευσης" width="260" height="260" />
        <div><p className="muted">Χειροκίνητη εισαγωγή (τύπος: βάσει χρόνου):</p><code className="secret">{setup.secret.match(/.{1,4}/g).join(' ')}</code></div></div>
      <form onSubmit={verify} className="stack-form"><div className="fld"><label htmlFor="vc">Κωδικός επαλήθευσης</label><input id="vc" inputMode="numeric" pattern="[0-9 ]*" maxLength={7} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required /></div><Err />
        <div className="row"><button className="btn btn-primary" disabled={busy}>Επαλήθευση και ενεργοποίηση</button><button type="button" className="btn btn-ghost" onClick={() => { setStep('idle'); setSetup(null); }}>Άκυρο</button></div></form></div>);
  return (
    <div className="card form-card"><MascotSay mood="phone" k="twofa" /><h2>Επαλήθευση δύο βημάτων: <span className="pill draft">Ανενεργή</span></h2>
      <p>Πρόσθεσε ένα δεύτερο βήμα ασφαλείας: ακόμα κι αν κάποιος μάθει τον κωδικό σου, δεν θα μπορεί να μπει χωρίς το κινητό σου.</p>
      {step !== 'pw' ? <button type="button" className="btn btn-primary" onClick={() => setStep('pw')}>Ενεργοποίηση</button> : (
        <form onSubmit={start} className="stack-form"><div className="fld"><label htmlFor="sp">Επιβεβαίωσε τον κωδικό πρόσβασής σου</label><input id="sp" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div><Err />
          <div className="row"><button className="btn btn-primary" disabled={busy}>Συνέχεια</button><button type="button" className="btn btn-ghost" onClick={() => setStep('idle')}>Άκυρο</button></div></form>)}</div>);
}
