'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';

/** Φίλοι: αίτημα με ακριβές όνομα χρήστη, εισερχόμενα/εξερχόμενα αιτήματα, φίλοι, μπλοκαρισμένοι. */
export default function Friends({ me }) {
  const [d, setD] = useState(null), [nick, setNick] = useState(''), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const load = () => api('/api/community/friends').then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const act = async (action, extra, ok) => {
    setErr(''); setMsg('');
    try { const r = await api('/api/community/friends', { method: 'POST', body: { action, ...extra } }); setD((x) => ({ ...x, ...r })); if (ok) setMsg(ok); return true; } catch (e) { setErr(e.message); return false; }
  };
  if (!d) return <p className="muted">{err || 'Φόρτωση…'}</p>;
  if (!d.enabled) return <p className="muted">Οι φίλοι είναι προσωρινά κλειστοί.</p>;
  const P = ({ p, children }) => <li className="fr"><Mascot mood={p.avatar} size={46} /><b>{p.nickname}</b><span className="grow" />{children}</li>;
  return (
    <div className="frs">
      <section className="card fr-add"><h2 className="h3">Πρόσθεσε φίλο</h2>
        <p className="muted">Γράψε <b>ακριβώς</b> το όνομα χρήστη του φίλου σου (το βλέπει στον λογαριασμό του). Το δικό σου είναι: <b className="nick-me">{me}</b></p>
        <form className="fr-form" onSubmit={async (e) => { e.preventDefault(); if (await act('request', { nickname: nick }, 'Το αίτημα στάλθηκε! 📨')) setNick(''); }}>
          <label htmlFor="fr-n" className="sr-only">Όνομα χρήστη</label><input id="fr-n" value={nick} onChange={(e) => setNick(e.target.value)} placeholder="π.χ. kimolakis_fan" maxLength={40} autoComplete="off" />
          <button className="btn btn-primary sm" disabled={!nick.trim()}>Αποστολή αιτήματος</button></form>
        {msg && <p className="ok" role="status">{msg}</p>}{err && <p className="err" role="alert">{err}</p>}
        <p className="fr-safe">🛡️ Κάνε φίλους μόνο παιδιά που ξέρεις από το σχολείο. Αν κάποιος σε ενοχλεί, πάτα <b>Μπλοκ</b> ή <b>Αναφορά</b> και πες το σε έναν μεγάλο που εμπιστεύεσαι.</p>
      </section>
      {d.incoming.length > 0 && <section className="card"><h2 className="h3">Αιτήματα φιλίας <span className="cnt">{d.incoming.length}</span></h2>
        <ul className="fr-list">{d.incoming.map((p) => <P key={p.id} p={p}><button className="btn btn-primary sm" onClick={() => act('accept', { id: p.id }, `Εσύ και ${p.nickname} είστε πλέον φίλοι! 🎉`)}>Αποδοχή</button><button className="btn btn-ghost sm" onClick={() => act('decline', { id: p.id })}>Απόρριψη</button><button className="linkbtn" onClick={() => confirm(`Να μπλοκαριστεί ${p.nickname};`) && act('block', { id: p.id })}>Μπλοκ</button></P>)}</ul></section>}
      <section className="card"><h2 className="h3">Οι φίλοι μου <span className="cnt">{d.friends.length}</span></h2>
        {!d.friends.length ? <p className="muted">Δεν έχεις φίλους ακόμα. Στείλε ένα αίτημα παραπάνω!</p> : <ul className="fr-list">{d.friends.map((p) => <P key={p.id} p={p}>
          {d.messages && <Link className="btn btn-primary sm" href={`/messages?with=${p.id}`} prefetch={false}>💬 Μήνυμα{p.unread ? <span className="cbadge">{p.unread}</span> : null}</Link>}
          <button className="linkbtn" onClick={() => confirm(`Να αφαιρεθεί ${p.nickname} από τους φίλους σου;`) && act('remove', { id: p.id })}>Αφαίρεση</button>
          <button className="linkbtn" onClick={() => confirm(`Να μπλοκαριστεί ${p.nickname}; Δεν θα μπορεί να σου στείλει αίτημα ή μήνυμα.`) && act('block', { id: p.id })}>Μπλοκ</button></P>)}</ul>}</section>
      {d.outgoing.length > 0 && <section className="card"><h2 className="h3">Αιτήματα που έστειλα</h2><ul className="fr-list">{d.outgoing.map((p) => <P key={p.id} p={p}><span className="muted">Σε αναμονή…</span><button className="linkbtn" onClick={() => act('cancel', { id: p.id })}>Ακύρωση</button></P>)}</ul></section>}
      {d.blocked.length > 0 && <section className="card"><h2 className="h3">Μπλοκαρισμένοι</h2><ul className="fr-list">{d.blocked.map((p) => <P key={p.id} p={p}><button className="btn btn-ghost sm" onClick={() => act('unblock', { id: p.id })}>Ξεμπλοκάρισμα</button></P>)}</ul></section>}
    </div>
  );
}
