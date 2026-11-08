'use client';
import { useState } from 'react';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';

/** Κουμπί λήψης/εκτύπωσης: ελέγχει την πρόσβαση και, αν χρειάζεται, ζητά κωδικό μίας χρήσης από το email του μαθητή. */
export default function PrintButton({ slug, ready = false, icon = false }) {
  const url = `/api/pdf/print/${slug}?download=1`;
  const [ok, setOk] = useState(ready), [open, setOpen] = useState(false), [stage, setStage] = useState('ask'), [code, setCode] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const start = async () => {
    setErr('');
    try { await api(url + '&check=1'); window.location.href = url; }
    catch (e) { if (/κωδικό/.test(e.message)) { setOk(false); setStage('ask'); setCode(''); setOpen(true); } else if (/λογαριασμ/.test(e.message)) window.location.href = `/account/login?next=${encodeURIComponent('/editions/' + slug)}`; else { setErr(e.message); setOpen(true); setStage('error'); } }
  };
  const send = async () => { setBusy(true); setErr(''); try { await api('/api/account/download/send', { method: 'POST' }); setStage('code'); } catch (e) { setErr(e.message); } setBusy(false); };
  const verify = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/api/account/download/verify', { method: 'POST', body: { code } }); setOk(true); setOpen(false); window.location.href = url; } catch (x) { setErr(x.message); } setBusy(false); };
  return (
    <>
      <button type="button" className={icon ? 'icon-btn' : 'btn btn-ghost'} onClick={ok ? () => { window.location.href = url; } : start} aria-label="Λήψη εκτυπώσιμου PDF" title="Λήψη εκτυπώσιμου PDF">{icon ? '⬇' : '⬇ Λήψη εκτυπώσιμου PDF'}</button>
      {open && (
        <div className="modal-back" onClick={() => !busy && setOpen(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="pb-t" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="modal-x" onClick={() => setOpen(false)} aria-label="Κλείσιμο">✕</button>
          <div className="center"><Mascot mood="phone" size={90} /></div><h3 id="pb-t">Επιβεβαίωση με κωδικό από το email</h3>
          {stage === 'ask' && <><p>Για την ασφάλεια των τευχών και για να κρατάμε τα ρομπότ μακριά, στέλνουμε έναν <b>κωδικό μίας χρήσης</b> στο email σου. Μετά μπορείς να κατεβάζεις και να εκτυπώνεις για <b>30 λεπτά</b>.</p>
            {err && <p className="err" role="alert">{err}</p>}<div className="btns"><button type="button" className="btn btn-primary" onClick={send} disabled={busy}>{busy ? 'Αποστολή…' : 'Στείλε μου κωδικό'}</button></div></>}
          {stage === 'code' && <form onSubmit={verify} className="stack-form"><div className="fld"><label htmlFor="pbc">Κωδικός από το email<small>6 ψηφία · ισχύει για 10 λεπτά</small></label><input id="pbc" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} required autoFocus /></div>
            {err && <p className="err" role="alert">{err}</p>}<div className="btns"><button className="btn btn-primary" disabled={busy}>{busy ? 'Έλεγχος…' : 'Επιβεβαίωση και λήψη'}</button><button type="button" className="btn btn-ghost" onClick={send} disabled={busy}>Στείλε νέο κωδικό</button></div></form>}
          {stage === 'error' && <p className="err" role="alert">{err}</p>}
        </div></div>)}
    </>
  );
}
