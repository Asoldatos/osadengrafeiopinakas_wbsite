'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, toast } from '@/lib/clientUpload';
import { TICKET_KINDS, TICKET_STATUS } from '@/lib/community.mjs';
import { fmtDate } from '@/lib/util';

/** Εισερχόμενα αιτήματα επικοινωνίας: λίστα, συζήτηση, απάντηση με email, κατάσταση. */
export default function TicketsAdmin() {
  const sp = useSearchParams();
  const [st, setSt] = useState('open'), [d, setD] = useState(null), [open, setOpen] = useState(+sp.get('id') || 0), [t, setT] = useState(null), [reply, setReply] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(() => api(`/api/admin/tickets?status=${st}`).then(setD).catch((e) => toast(e.message, 'oops')), [st]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setT(null); if (open) api(`/api/admin/tickets/${open}`).then(setT).catch((e) => toast(e.message, 'oops')); }, [open]);
  const send = async (close) => {
    setBusy(true);
    try { const r = await api(`/api/admin/tickets/${open}`, { method: 'POST', body: { message: reply, close } }); setT((x) => ({ ...x, thread: r.thread, ticket: { ...x.ticket, status: r.status } })); setReply(''); toast(r.mailed ? 'Η απάντηση στάλθηκε με email!' : 'Αποθηκεύτηκε (το email δεν στάλθηκε: έλεγξε τις ρυθμίσεις email).', r.mailed ? 'celebrate' : 'confused'); load(); } catch (e) { toast(e.message, 'oops'); }
    setBusy(false);
  };
  const setStatus = async (status) => { try { await api(`/api/admin/tickets/${open}`, { method: 'PUT', body: { status } }); setT((x) => ({ ...x, ticket: { ...x.ticket, status } })); load(); } catch (e) { toast(e.message, 'oops'); } };
  const del = async () => { if (!confirm('Να διαγραφεί οριστικά το αίτημα;')) return; try { await api(`/api/admin/tickets/${open}`, { method: 'DELETE' }); setOpen(0); load(); } catch (e) { toast(e.message, 'oops'); } };
  const c = d?.counts || {};
  return (
    <div className="tka">
      <div className="adm-tools tka-tabs">{[['open', 'Νέα'], ['pending', 'Σε εξέλιξη'], ['answered', 'Απαντήθηκαν'], ['closed', 'Κλειστά'], ['all', 'Όλα']].map(([k, l]) => <button key={k} type="button" className={`btn sm ${st === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSt(k)}>{l}{k !== 'all' && c[k] ? ` (${c[k]})` : ''}</button>)}</div>
      <div className="tka-grid">
        <ul className="tka-list">{!d ? <li className="muted">Φόρτωση…</li> : !d.rows.length ? <li className="muted">Κανένα αίτημα εδώ. 🎉</li> : d.rows.map((r) => (
          <li key={r.id}><button type="button" className={open === r.id ? 'on' : ''} onClick={() => setOpen(r.id)}><span className="tka-k">{TICKET_KINDS[r.kind]}</span><b>#{r.id} · {r.subject}</b><small>{r.name || r.email} · {fmtDate(r.updated_at)} · {r.n} μην.</small><span className={`pill st-${r.status}`}>{TICKET_STATUS[r.status]}</span></button></li>))}</ul>
        <section className="tka-view card">{!open ? <p className="muted">Διάλεξε ένα αίτημα από τη λίστα.</p> : !t ? <p className="muted">Φόρτωση…</p> : <>
          <header><span className="tka-k">{TICKET_KINDS[t.ticket.kind]}</span><h2>#{t.ticket.id} · {t.ticket.subject}</h2>
            <p className="muted">{t.ticket.name && <b>{t.ticket.name} · </b>}<a href={`mailto:${t.ticket.email}`}>{t.ticket.email}</a>{t.ticket.nickname && <> · μαθητής: <b>{t.ticket.nickname}</b></>} · {fmtDate(t.ticket.created_at)}</p>
            <div className="btns"><select value={t.ticket.status} onChange={(e) => setStatus(e.target.value)} aria-label="Κατάσταση">{Object.entries(TICKET_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><button type="button" className="btn btn-danger sm" onClick={del}>Διαγραφή</button></div></header>
          <ol className="tk-thread">{t.thread.map((m) => <li key={m.id} className={m.author === 'staff' ? 'staff' : 'user'}><div className="tk-meta"><b>{m.author === 'staff' ? `✏️ ${m.user_name}` : m.user_name}</b> · {fmtDate(m.created_at)}</div><p>{m.body}</p></li>)}</ol>
          <div className="fld"><label htmlFor="tka-r">Απάντηση (στέλνεται με email στον αποστολέα)</label><textarea id="tka-r" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={6000} /></div>
          <div className="btns"><button type="button" className="btn btn-primary sm" disabled={busy || reply.trim().length < 2} onClick={() => send(false)}>Αποστολή απάντησης</button><button type="button" className="btn btn-ghost sm" disabled={busy || reply.trim().length < 2} onClick={() => send(true)}>Αποστολή και κλείσιμο</button></div>
        </>}</section>
      </div>
    </div>
  );
}
