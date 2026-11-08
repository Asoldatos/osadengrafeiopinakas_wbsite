'use client';
import { useEffect, useState } from 'react';
import { api, toast } from '@/lib/clientUpload';
import Mascot from '../Mascot';

/** Προεπισκόπηση, δοκιμαστική αποστολή και αποστολή σε παρτίδες (με πρόοδο) για μία αποστολή ενημερωτικού. */
export default function CampaignActions({ row, reload }) {
  const [m, setM] = useState(null), [html, setHtml] = useState(''), [to, setTo] = useState(''), [busy, setBusy] = useState(false), [stats, setStats] = useState(null), [prog, setProg] = useState(null), [err, setErr] = useState('');
  const close = () => { if (!busy) { setM(null); reload?.(); } };
  const open = async (kind) => {
    setErr(''); setProg(null); setM(kind);
    try {
      if (kind === 'preview') { setHtml(''); setHtml((await api('/api/admin/newsletter/preview', { method: 'POST', body: { id: row.id } })).html); }
      if (kind === 'send') setStats(await api('/api/admin/newsletter/stats'));
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { if (m === 'send' && row.status !== 'draft') setProg({ sent: row.sent_count, failed: row.failed_count, total: row.total, remaining: row.total - row.sent_count - row.failed_count }); }, [m]);
  const test = async () => { setBusy(true); setErr(''); try { await api('/api/admin/newsletter/test', { method: 'POST', body: { id: row.id, to } }); toast('Η δοκιμαστική αποστολή έγινε! Έλεγξε το email σου.', 'celebrate'); setM(null); } catch (e) { setErr(e.message); } setBusy(false); };
  const send = async () => {
    setBusy(true); setErr('');
    try { for (;;) { const r = await api('/api/admin/newsletter/send', { method: 'POST', body: { id: row.id } }); setProg(r); if (r.remaining === 0) { toast('Η αποστολή ολοκληρώθηκε!', 'celebrate'); break; } } } catch (e) { setErr(e.message + ' (Μπορείς να συνεχίσεις την αποστολή.)'); }
    setBusy(false);
  };
  const retry = async () => { await api('/api/admin/newsletter/retry', { method: 'POST', body: { id: row.id } }); reload?.(); setM(null); toast('Οι αποτυχημένες αποστολές θα ξαναδοκιμαστούν. Πάτα ξανά «Αποστολή».'); };
  const pct = prog && prog.total ? Math.round(((prog.sent + prog.failed) / prog.total) * 100) : 0, finished = prog && prog.remaining === 0;
  return (
    <>
      <button type="button" className="btn btn-ghost sm" onClick={() => open('preview')}>Προεπισκόπηση</button>
      <button type="button" className="btn btn-ghost sm" onClick={() => open('test')}>Δοκιμή</button>
      <button type="button" className="btn btn-primary sm" onClick={() => open('send')}>{row.status === 'draft' ? 'Αποστολή σε όλους' : row.status === 'sending' ? 'Συνέχεια αποστολής' : 'Αποτελέσματα'}</button>
      {m && <div className="modal-back" onClick={close}><div className={`modal${m === 'preview' ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={row.subject} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-x" onClick={close} aria-label="Κλείσιμο">✕</button>
        {m === 'preview' && <><h3>Προεπισκόπηση: {row.subject}</h3>{err && <p className="err">{err}</p>}{html ? <iframe title="Προεπισκόπηση email" className="mailprev" sandbox="" srcDoc={html} /> : !err && <p>Φόρτωση…</p>}</>}
        {m === 'test' && <><h3>Δοκιμαστική αποστολή</h3><p>Στείλε το μήνυμα μόνο στον εαυτό σου για να δεις πώς φαίνεται στα εισερχόμενα.</p><div className="fld"><label htmlFor="tt">Email παραλήπτη</label><input id="tt" type="email" value={to} onChange={(e) => setTo(e.target.value)} autoFocus /></div>{err && <p className="err" role="alert">{err}</p>}<button type="button" className="btn btn-primary" onClick={test} disabled={busy || !to}>{busy ? 'Αποστολή…' : 'Στείλε δοκιμή'}</button></>}
        {m === 'send' && <><div className="center"><Mascot mood={finished ? 'celebrate' : busy ? 'work' : 'wave'} size={90} /></div><h3>Αποστολή: {row.subject}</h3>
          {!prog && stats && <><p>Το μήνυμα θα σταλεί σε <b>{stats.active}</b> ενεργούς συνδρομητές.</p><p className="muted small">Αφού ξεκινήσει, δεν μπορεί να ανακληθεί και το περιεχόμενο κλειδώνει. Έχεις στείλει δοκιμή και είδες την προεπισκόπηση;</p></>}
          {prog && <><div className="bar" aria-label={`Πρόοδος ${pct}%`}><span style={{ width: `${pct}%` }} /></div><p><b>{prog.sent}</b> εστάλησαν{prog.failed > 0 && <> · <b className="bad">{prog.failed}</b> απέτυχαν</>} · απομένουν {prog.remaining}</p>{finished && <p className="ok">✔ Η αποστολή ολοκληρώθηκε.</p>}</>}
          {err && <p className="err" role="alert">{err}</p>}
          <div className="btns">{!finished && <button type="button" className="btn btn-primary" onClick={send} disabled={busy || (stats && !stats.active && !prog)}>{busy ? 'Αποστολή… (μην κλείσεις τη σελίδα)' : prog ? 'Συνέχεια αποστολής' : 'Έναρξη αποστολής'}</button>}
            {prog?.failed > 0 && !busy && <button type="button" className="btn btn-ghost" onClick={retry}>Ξαναπροσπάθεια αποτυχημένων</button>}</div></>}
      </div></div>}
    </>
  );
}
