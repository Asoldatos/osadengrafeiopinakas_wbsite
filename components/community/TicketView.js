'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/clientUpload';
import { TICKET_KINDS, TICKET_STATUS } from '@/lib/community.mjs';
import { fmtDate } from '@/lib/util';

/** Ο αποστολέας βλέπει τη συζήτηση του αιτήματός του (μυστικός σύνδεσμος) και απαντά. */
export default function TicketView({ token }) {
  const [d, setD] = useState(null), [err, setErr] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { api(`/api/contact/ticket?t=${encodeURIComponent(token)}`).then(setD).catch((e) => setErr(e.message)); }, [token]);
  const send = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api('/api/contact/ticket', { method: 'POST', body: { t: token, message: msg } }); setD((x) => ({ ...x, thread: r.thread, ticket: { ...x.ticket, status: 'open' } })); setMsg(''); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  if (err && !d) return <p className="err" role="alert">{err} Ο σύνδεσμος αλλάζει σε κάθε απάντησή μας: χρησιμοποίησε τον πιο πρόσφατο από το email σου.</p>;
  if (!d) return <p className="muted">Φόρτωση…</p>;
  const t = d.ticket;
  return (
    <div className="tk">
      <header className="tk-h"><span className="chip">{TICKET_KINDS[t.kind]}</span><span className={`tk-st st-${t.status}`}>{TICKET_STATUS[t.status]}</span><h1 className="h2">#{t.id} · {t.subject}</h1></header>
      <ol className="tk-thread">{d.thread.map((m) => <li key={m.id} className={m.author === 'staff' ? 'staff' : 'user'}><div className="tk-meta"><b>{m.author === 'staff' ? `✏️ ${m.user_name || 'Η σύνταξη'}` : 'Εσύ'}</b> · {fmtDate(m.created_at)}</div><p>{m.body}</p></li>)}</ol>
      {t.status === 'closed' ? <p className="muted">Το αίτημα έχει κλείσει. Για κάτι νέο, στείλε μας ξανά από τη φόρμα επικοινωνίας.</p> : (
        <form onSubmit={send} className="tk-reply"><div className="fld"><label htmlFor="tk-m">Γράψε ξανά στη σύνταξη</label><textarea id="tk-m" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={4000} /></div>
          {err && <p className="err" role="alert">{err}</p>}<button className="btn btn-primary sm" disabled={busy || msg.trim().length < 2}>{busy ? 'Αποστολή…' : 'Αποστολή'}</button></form>)}
    </div>
  );
}
