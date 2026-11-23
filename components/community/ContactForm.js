'use client';
import { useState } from 'react';
import Link from 'next/link';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';
import { TICKET_KINDS } from '@/lib/community.mjs';

/** Φόρμα επικοινωνίας → αίτημα (ticket) με αριθμό και σύνδεσμο παρακολούθησης. */
export default function ContactForm({ student, initialKind = 'idea' }) {
  const [f, setF] = useState({ kind: TICKET_KINDS[initialKind] ? initialKind : 'idea', name: student?.nickname || '', email: '', subject: '', message: '', consent: false, website: '' });
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const send = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { setDone(await api('/api/contact', { method: 'POST', body: f })); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  if (done) return (
    <div className="cf-done card" role="status"><Mascot mood="celebrate" size={130} />
      <div><h2 className="h3">Το μήνυμά σου στάλθηκε</h2><p>Ο αριθμός του αιτήματός σου είναι <b>#{done.ref}</b>. Σου στείλαμε email με έναν σύνδεσμο για να βλέπεις τις απαντήσεις μας.</p>
        <div className="btns">{done.link && <Link className="btn btn-primary sm" href={done.link}>Δες το αίτημα</Link>}<button type="button" className="btn btn-ghost sm" onClick={() => { setDone(null); setF((x) => ({ ...x, subject: '', message: '' })); }}>Νέο μήνυμα</button></div></div>
    </div>);
  const hint = { idea: 'Ποιο θέμα θα ήθελες να διαβάσεις στην εφημερίδα; Πες μας τι, γιατί και πού να ψάξουμε!', article: 'Γράψε μας για τι θέλεις να γράψεις και από ποια τάξη είσαι. Θα σε βοηθήσουμε σε όλα τα βήματα!', question: 'Ρώτα μας ό,τι θέλεις για την εφημερίδα ή τον ιστότοπο.', bug: 'Τι δεν δουλεύει; Σε ποια σελίδα και από ποια συσκευή (κινητό/υπολογιστής);', other: 'Γράψε μας ελεύθερα.' }[f.kind];
  return (
    <form className="cf card" onSubmit={send} noValidate>
      <fieldset className="cf-kinds"><legend className="fld-l">Τι θέλεις να μας πεις;</legend>
        {Object.entries(TICKET_KINDS).map(([k, l]) => <label key={k} className={`cf-kind${f.kind === k ? ' on' : ''}`}><input type="radio" name="kind" value={k} checked={f.kind === k} onChange={set('kind')} />{l}</label>)}</fieldset>
      <p className="cf-hint">{hint}</p>
      <div className="cf-row">
        <div className="fld"><label htmlFor="cf-n">Όνομα <small>(προαιρετικό)</small></label><input id="cf-n" value={f.name} onChange={set('name')} maxLength={80} autoComplete="name" /></div>
        {student ? <div className="fld"><label>Email</label><p className="cf-me">Θα απαντήσουμε στο email του λογαριασμού σου.</p></div>
          : <div className="fld"><label htmlFor="cf-e">Email *</label><input id="cf-e" type="email" required value={f.email} onChange={set('email')} maxLength={254} autoComplete="email" /></div>}
      </div>
      <div className="fld"><label htmlFor="cf-s">Θέμα *</label><input id="cf-s" required value={f.subject} onChange={set('subject')} maxLength={140} /></div>
      <div className="fld"><label htmlFor="cf-m">Μήνυμα *</label><textarea id="cf-m" required rows={7} value={f.message} onChange={set('message')} maxLength={4000} /><small className="muted">{f.message.length}/4000</small></div>
      <div className="hp" aria-hidden="true"><label htmlFor="cf-w">Ιστότοπος</label><input id="cf-w" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></div>
      <label className="chk"><input type="checkbox" checked={f.consent} onChange={set('consent')} /> Συμφωνώ να κρατηθεί το email μου μόνο για να μου απαντήσετε.</label>
      {err && <p className="err" role="alert">{err}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Αποστολή…' : 'Αποστολή μηνύματος'}</button>
    </form>
  );
}
