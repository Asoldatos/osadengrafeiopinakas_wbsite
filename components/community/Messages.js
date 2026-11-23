'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';

const time = (d) => new Date(d).toLocaleString('el-GR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
const REASONS = [['bully', 'Με ενοχλεί / με προσβάλλει'], ['unsafe', 'Ζητάει προσωπικά στοιχεία ή να βρεθούμε'], ['adult', 'Ακατάλληλο περιεχόμενο'], ['spam', 'Spam'], ['other', 'Άλλο']];
const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

/** Μηνύματα: λίστα φίλων αριστερά, συνομιλία δεξιά (στο κινητό: το ένα ή το άλλο). Ανανέωση με «polling» μόνο όσο η καρτέλα είναι ορατή. */
export default function Messages() {
  const sp = useSearchParams(), router = useRouter(); const withId = +sp.get('with') || 0;
  const [friends, setFriends] = useState(null), [enabled, setEnabled] = useState(true), [msgs, setMsgs] = useState([]), [seen, setSeen] = useState(0), [text, setText] = useState(''), [err, setErr] = useState(''), [rep, setRep] = useState(null);
  const endRef = useRef(null), lastRef = useRef(0);
  const other = friends?.find((f) => f.id === withId);
  const loadFriends = useCallback(() => api('/api/community/friends').then((r) => { setFriends(r.friends); setEnabled(r.enabled && r.messages); }).catch((e) => setErr(e.message)), []);
  useEffect(() => { loadFriends(); const t = setInterval(() => visible() && loadFriends(), 20000); return () => clearInterval(t); }, [loadFriends]);
  useEffect(() => {
    setMsgs([]); lastRef.current = 0; setErr(''); if (!withId) return;
    let alive = true;
    const pull = async (first) => {
      if (!first && !visible()) return;
      try { const r = await api(`/api/community/messages?with=${withId}${lastRef.current ? `&after=${lastRef.current}` : ''}`); if (!alive) return;
        if (r.messages.length) { lastRef.current = r.messages[r.messages.length - 1].id; setMsgs((m) => (first ? r.messages : [...m, ...r.messages.filter((x) => !m.some((y) => y.id === x.id))])); }
        setSeen(r.seenUpTo); if (first) loadFriends();
      } catch (e) { if (alive) setErr(e.message); }
    };
    pull(true); const t = setInterval(() => pull(false), 4000);
    return () => { alive = false; clearInterval(t); };
  }, [withId, loadFriends]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  const send = async (e) => {
    e.preventDefault(); const body = text.trim(); if (!body) return; setErr('');
    try { const r = await api('/api/community/messages', { method: 'POST', body: { to: withId, body } }); setMsgs((m) => [...m, r.message]); lastRef.current = Math.max(lastRef.current, r.message.id); setText(''); } catch (x) { setErr(x.message); }
  };
  const report = async (e) => {
    e.preventDefault();
    try { await api('/api/community/report', { method: 'POST', body: { id: withId, reason: rep.reason, detail: rep.detail, block: rep.block } }); setRep(null); if (rep.block) { router.replace('/messages'); loadFriends(); } alert('Ευχαριστούμε! Η αναφορά στάλθηκε στους διαχειριστές. Αν νιώθεις ότι κινδυνεύεις, μίλησε ΤΩΡΑ σε έναν γονιό ή καθηγητή.'); } catch (x) { setErr(x.message); }
  };
  if (!friends) return <p className="muted">{err || 'Φόρτωση…'}</p>;
  if (!enabled) return <p className="muted">Τα μηνύματα είναι προσωρινά κλειστά.</p>;
  return (
    <div className={`dm${withId ? ' has-chat' : ''}`}>
      <aside className="dm-list" aria-label="Συνομιλίες">
        <div className="dm-list-h"><h2 className="h3">Συνομιλίες</h2><Link href="/account/friends" className="linkbtn">+ Φίλοι</Link></div>
        {!friends.length ? <p className="muted">Πρόσθεσε φίλους για να ξεκινήσεις να συζητάτε! <Link href="/account/friends">Πήγαινε στους φίλους →</Link></p> : (
          <ul>{friends.map((f) => <li key={f.id}><Link href={`/messages?with=${f.id}`} className={f.id === withId ? 'on' : ''} scroll={false}><Mascot mood={f.avatar} size={40} /><b>{f.nickname}</b>{f.unread > 0 && <span className="cbadge">{f.unread}</span>}</Link></li>)}</ul>)}
      </aside>
      <section className="dm-chat" aria-label="Συνομιλία">
        {!withId || !other ? <div className="dm-empty"><Mascot mood="phone" size={140} /><p>{withId && !other ? 'Μπορείς να στείλεις μηνύματα μόνο σε φίλους.' : 'Διάλεξε έναν φίλο για να του γράψεις.'}</p></div> : <>
          <header className="dm-h"><Link href="/messages" className="dm-back" aria-label="Πίσω στις συνομιλίες">←</Link><Mascot mood={other.avatar} size={38} /><b>{other.nickname}</b><span className="grow" />
            <button type="button" className="linkbtn" onClick={() => setRep({ reason: 'bully', detail: '', block: true })}>Αναφορά</button></header>
          <ol className="dm-msgs">{!msgs.length && <li className="dm-hello">Πείτε ένα γεια. Τα μηνύματα σβήνονται αυτόματα μετά από λίγες εβδομάδες.</li>}
            {msgs.map((m) => <li key={m.id} className={m.mine ? 'me' : 'them'}><p>{m.body}</p><small>{time(m.at)}{m.mine && m.id <= seen ? ' · διαβάστηκε' : ''}</small></li>)}<li ref={endRef} aria-hidden="true" /></ol>
          {err && <p className="err dm-err" role="alert">{err}</p>}
          <form className="dm-form" onSubmit={send}><label htmlFor="dm-t" className="sr-only">Μήνυμα</label><input id="dm-t" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Γράψε ένα μήνυμα…" autoComplete="off" /><button className="btn btn-primary sm" disabled={!text.trim()}>Αποστολή</button></form>
          <p className="dm-safe">Ποτέ μη δίνεις διεύθυνση, τηλέφωνο, κωδικούς ή φωτογραφίες, και μη δέχεσαι να βρεθείς με κάποιον που γνώρισες εδώ.</p>
        </>}
      </section>
      {rep && <div className="g3d-pop-back" onClick={() => setRep(null)}><form className="g3d-pop dm-rep" role="dialog" aria-modal="true" aria-labelledby="rep-t" onSubmit={report} onClick={(e) => e.stopPropagation()}>
        <h2 id="rep-t">Αναφορά συνομιλίας</h2><p>Οι διαχειριστές θα δουν τα τελευταία μηνύματα αυτής της συνομιλίας για να βοηθήσουν.</p>
        {REASONS.map(([k, l]) => <label key={k} className="chk"><input type="radio" name="r" checked={rep.reason === k} onChange={() => setRep({ ...rep, reason: k })} /> {l}</label>)}
        <div className="fld"><label htmlFor="rep-d">Θέλεις να πεις κάτι ακόμα; (προαιρετικό)</label><textarea id="rep-d" rows={3} maxLength={1000} value={rep.detail} onChange={(e) => setRep({ ...rep, detail: e.target.value })} /></div>
        <label className="chk"><input type="checkbox" checked={rep.block} onChange={(e) => setRep({ ...rep, block: e.target.checked })} /> Μπλόκαρε επίσης αυτόν τον χρήστη</label>
        <div className="btns"><button className="btn btn-danger">Αποστολή αναφοράς</button><button type="button" className="btn btn-ghost" onClick={() => setRep(null)}>Ακύρωση</button></div></form></div>}
    </div>
  );
}
