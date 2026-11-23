'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';
import { fmtDate } from '@/lib/util';
import Icon from '../Icons';

const nf = (n) => new Intl.NumberFormat('el-GR', { notation: n >= 10000 ? 'compact' : 'standard' }).format(n || 0);
/** Προβολές, likes και σχόλια στο τέλος ενός άρθρου. */
export default function ArticleSocial({ id, slug }) {
  const [d, setD] = useState(null), [text, setText] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [pop, setPop] = useState(false);
  useEffect(() => {
    let alive = true;
    api(`/api/articles/${id}/comments`).then((r) => alive && setD(r)).catch(() => {});
    // +1 προβολή, μία φορά ανά επίσκεψη
    try { const k = 'seen:' + id; if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); api(`/api/articles/${id}/view`, { method: 'POST', body: {} }).then((r) => alive && r?.views && setD((x) => (x ? { ...x, views: r.views } : x))).catch(() => {}); } } catch {}
    return () => { alive = false; };
  }, [id]);
  if (!d) return null;
  const login = `/account/login?next=${encodeURIComponent(`/articles/${slug}#comments`)}`;
  const like = async () => {
    if (!d.me) { location.href = login; return; }
    try { const r = await api(`/api/articles/${id}/like`, { method: 'POST', body: {} }); setD((x) => ({ ...x, liked: r.liked, likes: r.likes })); if (r.liked) { setPop(true); setTimeout(() => setPop(false), 700); } } catch (e) { setErr(e.message); }
  };
  const send = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await api(`/api/articles/${id}/comments`, { method: 'POST', body: { body: text } }); setD((x) => ({ ...x, comments: r.comments })); setText(''); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const report = async (c) => { if (!confirm('Να αναφερθεί αυτό το σχόλιο στους διαχειριστές;')) return; try { await api(`/api/comments/${c.id}`, { method: 'POST', body: {} }); setD((x) => ({ ...x, comments: x.comments.map((y) => (y.id === c.id ? { ...y, reported: true } : y)) })); } catch (e) { setErr(e.message); } };
  const remove = async (c) => { if (!confirm('Να σβηστεί το σχόλιό σου;')) return; try { await api(`/api/comments/${c.id}`, { method: 'DELETE' }); setD((x) => ({ ...x, comments: x.comments.filter((y) => y.id !== c.id) })); } catch (e) { setErr(e.message); } };
  return (
    <section className="soc" id="comments" aria-label="Αντιδράσεις αναγνωστών">
      <div className="soc-bar">
        {d.enabled.views && <span className="soc-stat" title="Προβολές"><Icon name="eye" size={17} /> <b>{nf(d.views)}</b> {d.views === 1 ? 'προβολή' : 'προβολές'}</span>}
        {d.enabled.likes && <button type="button" className={`soc-like${d.liked ? ' on' : ''}${pop ? ' pop' : ''}`} onClick={like} aria-pressed={d.liked}><Icon name="heart" size={18} /> <b>{nf(d.likes)}</b> <span>{d.liked ? 'Σου αρέσει' : 'Μου αρέσει'}</span></button>}
        {d.enabled.comments && <a href="#c-form" className="soc-stat"><Icon name="comment" size={17} /> <b>{nf(d.comments.length)}</b> σχόλια</a>}
      </div>
      {d.enabled.comments && <>
        <h2 className="h3">Σχόλια</h2>
        {d.me ? (
          <form id="c-form" className="c-form" onSubmit={send}><Mascot mood={d.me.avatar} size={44} />
            <div className="c-in"><label htmlFor="c-t" className="sr-only">Το σχόλιό σου</label><textarea id="c-t" rows={3} placeholder={`Τι σκέφτεσαι, ${d.me.nickname};`} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
              <div className="c-row"><small className="muted">Να είσαι ευγενικός. Μη γράφεις προσωπικά στοιχεία. {text.length}/1000</small><button className="btn btn-primary sm" disabled={busy || text.trim().length < 2}>{busy ? '…' : 'Δημοσίευση'}</button></div></div></form>
        ) : <p id="c-form" className="c-login"><Link className="btn btn-primary sm" href={login}>Συνδέσου</Link> για να γράψεις σχόλιο ή να κάνεις like.</p>}
        {err && <p className="err" role="alert">{err}</p>}
        {!d.comments.length ? <p className="muted">Κανένα σχόλιο ακόμα. Γράψε πρώτος.</p> : (
          <ul className="c-list">{d.comments.map((c) => (
            <li key={c.id}><Mascot mood={c.avatar} size={40} /><div><div className="c-meta"><b>{c.nickname}</b> · <time dateTime={c.created_at}>{fmtDate(c.created_at)}</time></div><p>{c.body}</p>
              <div className="c-acts">{c.mine ? <button type="button" className="linkbtn" onClick={() => remove(c)}>Διαγραφή</button> : d.me && (c.reported ? <span className="muted">Αναφέρθηκε</span> : <button type="button" className="linkbtn" onClick={() => report(c)}>🚩 Αναφορά</button>)}</div></div></li>))}</ul>)}
      </>}
    </section>
  );
}
