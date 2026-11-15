'use client';
import { useEffect, useState } from 'react';
import { api, toast } from '@/lib/clientUpload';
import Mascot from '../Mascot';

const pad = (n) => String(n).padStart(2, '0');
const toLocal = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`; };
const ath = (d) => new Date(d).toLocaleString('el-GR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Athens' });
const SEND_ST = { sent: '✅ Εστάλη', failed: '❌ Απέτυχε', pending: '⏳ Σε αναμονή', sending: '📤 Αποστέλλεται', skipped: '⏭ Παραλείφθηκε' };

/** Προεπισκόπηση, δοκιμή, προγραμματισμός, αποστολή σε παρτίδες (με πρόοδο) και αρχείο παράδοσης. */
export default function CampaignActions({ row, reload, canSend = true, myEmail = '' }) {
  const [m, setM] = useState(null), [html, setHtml] = useState(''), [to, setTo] = useState(myEmail), [busy, setBusy] = useState(false), [stats, setStats] = useState(null), [prog, setProg] = useState(null), [err, setErr] = useState('');
  const [warn, setWarn] = useState(null), [at, setAt] = useState(''), [log, setLog] = useState(null), [mobile, setMobile] = useState(false);
  const close = () => { if (!busy) { setM(null); reload?.(); } };
  const open = async (kind) => {
    setErr(''); setProg(null); setM(kind);
    try {
      if (kind === 'preview') { setHtml(''); setWarn(null); const r = await api('/api/admin/newsletter/preview', { method: 'POST', body: { id: row.id } }); setHtml(r.html); setWarn(r.warning || null); }
      if (kind === 'send' || kind === 'schedule') setStats(await api('/api/admin/newsletter/stats'));
      if (kind === 'schedule') { const y = new Date().getFullYear(), dec23 = new Date(`${y}-12-23T08:00:00`); setAt(toLocal(row.scheduled_at || (dec23 > new Date() ? dec23 : Date.now() + 3600e3))); }
      if (kind === 'log') { setLog(null); setLog(await api(`/api/admin/newsletter/log?id=${row.id}`)); }
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { if (m === 'send' && !['draft', 'scheduled'].includes(row.status)) setProg({ sent: row.sent_count, failed: row.failed_count, total: row.total, remaining: row.total - row.sent_count - row.failed_count }); }, [m]);
  const test = async () => { setBusy(true); setErr(''); try { await api('/api/admin/newsletter/test', { method: 'POST', body: { id: row.id, to } }); toast('Η δοκιμαστική αποστολή έγινε! Έλεγξε το email σου (και τα ανεπιθύμητα).', 'celebrate'); setM(null); } catch (e) { setErr(e.message); } setBusy(false); };
  const send = async () => {
    setBusy(true); setErr('');
    try { for (;;) { const r = await api('/api/admin/newsletter/send', { method: 'POST', body: { id: row.id } }); setProg(r); if (r.remaining === 0) { toast('Η αποστολή ολοκληρώθηκε!', 'celebrate'); break; } } } catch (e) { setErr(e.message + ' (Μπορείς να συνεχίσεις την αποστολή.)'); }
    setBusy(false);
  };
  const schedule = async () => { setBusy(true); setErr(''); try { const r = await api('/api/admin/newsletter/schedule', { method: 'POST', body: { id: row.id, at: new Date(at).toISOString() } }); toast(`Προγραμματίστηκε για ${ath(at)}`, 'celebrate'); if (r.warning) setTimeout(() => toast(r.warning, 'oops'), 600); setBusy(false); setM(null); reload?.(); } catch (e) { setErr(e.message); setBusy(false); } };
  const unschedule = async () => { if (!confirm('Να ακυρωθεί ο προγραμματισμός; Το μήνυμα θα γίνει ξανά πρόχειρο.')) return; try { await api('/api/admin/newsletter/unschedule', { method: 'POST', body: { id: row.id } }); toast('Ο προγραμματισμός ακυρώθηκε.'); reload?.(); } catch (e) { toast(e.message, 'oops'); } };
  const retry = async () => { try { await api('/api/admin/newsletter/retry', { method: 'POST', body: { id: row.id } }); reload?.(); setM(null); toast('Οι αποτυχημένες αποστολές θα ξαναδοκιμαστούν. Πάτα ξανά «Αποστολή».'); } catch (e) { toast(e.message, 'oops'); } };
  const pct = prog && prog.total ? Math.round(((prog.sent + prog.failed) / prog.total) * 100) : 0, finished = prog && prog.remaining === 0;
  const editable = ['draft', 'scheduled'].includes(row.status);
  return (
    <>
      <button type="button" className="btn btn-ghost sm" onClick={() => open('preview')}>Προεπισκόπηση</button>
      <button type="button" className="btn btn-ghost sm" onClick={() => open('test')}>Δοκιμή</button>
      {!editable && <button type="button" className="btn btn-ghost sm" onClick={() => open('log')}>Αρχείο</button>}
      {canSend && editable && (row.status === 'scheduled' ? <button type="button" className="btn btn-ghost sm" onClick={unschedule}>Ακύρωση ⏰</button> : null)}
      {canSend && editable && <button type="button" className="btn btn-ghost sm" onClick={() => open('schedule')}>{row.status === 'scheduled' ? 'Αλλαγή ώρας' : '⏰ Προγραμματισμός'}</button>}
      {canSend && <button type="button" className="btn btn-primary sm" onClick={() => open('send')}>{editable ? 'Αποστολή τώρα' : row.status === 'sending' ? 'Συνέχεια αποστολής' : 'Αποτελέσματα'}</button>}
      {m && <div className="modal-back" onClick={close}><div className={`modal${m === 'preview' || m === 'log' ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={row.subject} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-x" onClick={close} aria-label="Κλείσιμο">✕</button>
        {m === 'preview' && <><h3>Προεπισκόπηση: {row.subject}</h3>
          <div className="seg mb"><button type="button" className={!mobile ? 'on' : ''} onClick={() => setMobile(false)}>🖥 Υπολογιστής</button><button type="button" className={mobile ? 'on' : ''} onClick={() => setMobile(true)}>📱 Κινητό</button></div>
          {warn && <p className="card warn small">⚠️ {warn}</p>}{err && <p className="err">{err}</p>}{html ? <iframe title="Προεπισκόπηση email" className={`mailprev${mobile ? ' mobile' : ''}`} sandbox="" srcDoc={html} /> : !err && <p>Φόρτωση…</p>}
          <p className="muted small">Στην προεπισκόπηση το κουμπί ενεργοποίησης είναι δοκιμαστικό. Στη δοκιμαστική αποστολή λειτουργεί κανονικά (ακόμη και πριν ενεργοποιηθεί το θέμα), ώστε να δεις όλη τη μετάβαση.</p></>}
        {m === 'test' && <><h3>Δοκιμαστική αποστολή</h3><p>Στείλε το μήνυμα μόνο στον εαυτό σου για να δεις πώς φαίνεται στα εισερχόμενα και να δοκιμάσεις το κουμπί ενεργοποίησης.</p><div className="fld"><label htmlFor="tt">Email παραλήπτη</label><input id="tt" type="email" value={to} onChange={(e) => setTo(e.target.value)} autoFocus /></div>{err && <p className="err" role="alert">{err}</p>}<button type="button" className="btn btn-primary" onClick={test} disabled={busy || !to}>{busy ? 'Αποστολή…' : 'Στείλε δοκιμή'}</button></>}
        {m === 'schedule' && <><div className="center"><Mascot mood="reading" size={80} /></div><h3>Προγραμματισμός αποστολής</h3>
          <div className="fld"><label htmlFor="sat">Ημερομηνία και ώρα (ώρα συσκευής σου)</label><input id="sat" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></div>
          {at && <p className="small">Θα σταλεί: <b>{ath(at)}</b> (ώρα Ελλάδας){stats && <> σε περίπου <b>{stats.active}</b> ενεργούς συνδρομητές</>}.</p>}
          <p className="muted small">Ο αυτόματος έλεγχος τρέχει κάθε πρωί στις ~08:00 (ώρα Ελλάδας). Αν διαλέξεις άλλη ώρα, η αποστολή ξεκινά με τον επόμενο έλεγχο — ή αμέσως μόλις ανοίξει ο πίνακας διαχείρισης κάποιος με πρόσβαση στο newsletter. Μέχρι τότε μπορείς να το επεξεργάζεσαι ελεύθερα.</p>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="btns"><button type="button" className="btn btn-primary" onClick={schedule} disabled={busy || !at}>{busy ? 'Αποθήκευση…' : '⏰ Προγραμματισμός'}</button></div></>}
        {m === 'log' && <><h3>Αρχείο παράδοσης: {row.subject}</h3>{err && <p className="err">{err}</p>}
          {!log ? !err && <p>Φόρτωση…</p> : <>
            <p><b>{log.summary.sent}</b> εστάλησαν · <b>{log.summary.failed}</b> απέτυχαν · <b>{log.summary.remaining}</b> σε αναμονή · σύνολο {log.summary.total}{log.campaign?.sent_at && <> · ολοκληρώθηκε {ath(log.campaign.sent_at)}</>}</p>
            {log.campaign?.last_error && <p className="err">Τελευταίο σφάλμα: {log.campaign.last_error}</p>}
            <div className="tbl-wrap audit"><table className="tbl"><thead><tr><th>Email</th><th>Κατάσταση</th><th>Πότε</th><th>Σφάλμα</th></tr></thead>
              <tbody>{log.rows.map((x, i) => <tr key={i}><td>{x.email}</td><td>{SEND_ST[x.status] || x.status}</td><td className="small nowrap">{x.sent_at ? new Date(x.sent_at).toLocaleString('el-GR') : '—'}</td><td className="small">{x.error}</td></tr>)}</tbody></table></div></>}</>}
        {m === 'send' && <><div className="center"><Mascot mood={finished ? 'celebrate' : busy ? 'work' : 'wave'} size={90} /></div><h3>Αποστολή: {row.subject}</h3>
          {!prog && stats && <><p>Το μήνυμα θα σταλεί <b>τώρα</b> σε <b>{stats.active}</b> ενεργούς συνδρομητές.</p>{row.status === 'scheduled' && <p className="small">Ήταν προγραμματισμένο για {ath(row.scheduled_at)} — θα σταλεί τώρα αντί γι' αυτό.</p>}<p className="muted small">Αφού ξεκινήσει, δεν μπορεί να ανακληθεί και το περιεχόμενο κλειδώνει. Κάθε συνδρομητής το παίρνει μία φορά. Έχεις στείλει δοκιμή;</p></>}
          {prog && <><div className="bar" aria-label={`Πρόοδος ${pct}%`}><span style={{ width: `${pct}%` }} /></div><p><b>{prog.sent}</b> εστάλησαν{prog.failed > 0 && <> · <b className="bad">{prog.failed}</b> απέτυχαν</>} · απομένουν {prog.remaining}</p>{finished && <p className="ok">✔ Η αποστολή ολοκληρώθηκε.</p>}</>}
          {err && <p className="err" role="alert">{err}</p>}
          <div className="btns">{!finished && <button type="button" className="btn btn-primary" onClick={send} disabled={busy || (stats && !stats.active && !prog)}>{busy ? 'Αποστολή… (μην κλείσεις τη σελίδα)' : prog ? 'Συνέχεια αποστολής' : 'Έναρξη αποστολής'}</button>}
            {prog?.failed > 0 && !busy && <button type="button" className="btn btn-ghost" onClick={retry}>Ξαναπροσπάθεια αποτυχημένων</button>}
            {!editable && <button type="button" className="btn btn-ghost" onClick={() => open('log')}>Αρχείο παράδοσης</button>}</div></>}
      </div></div>}
    </>
  );
}
