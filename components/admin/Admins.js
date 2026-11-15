'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, toast } from '@/lib/clientUpload';
import { PERMS, PERM_KEYS, EDITOR_PRESET, can, isSuper } from '@/lib/perms.mjs';
import { fmtDate } from '@/lib/util';
import { MascotSay } from '../Mascot';

const ROLE = { superadmin: 'Superadmin', admin: 'Διαχειριστής', editor: 'Συντάκτης' };
const PRESETS = [
  ['Συντάκτης', EDITOR_PRESET], ['Υπεύθυνος newsletter', ['newsletter', 'newsletter_send', 'uploads']],
  ['Γραφίστας', ['appearance', 'themes', 'uploads']], ['Όλα εκτός διαχειριστών', PERM_KEYS.filter((k) => k !== 'admins')], ['Κανένα', []],
];
const fmtTime = (d) => (d ? new Date(d).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

/** Εμφάνιση κωδικού ΜΙΑ φορά, με αντιγραφή. */
function Secret({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `Όνομα χρήστη: ${data.username}\nΠροσωρινός κωδικός: ${data.password}\nΣύνδεση: ${location.origin}/editor-panel/login`;
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { toast('Δεν έγινε αντιγραφή· επίλεξε και αντέγραψε χειροκίνητα.', 'oops'); } };
  return (
    <div className="modal-back"><div className="modal" role="dialog" aria-modal="true" aria-label="Προσωρινός κωδικός">
      <MascotSay mood="phone" text="Αυτός ο κωδικός εμφανίζεται ΜΟΝΟ τώρα! Δώσ' τον με ασφάλεια (π.χ. από κοντά ή σε ιδιωτικό μήνυμα). Στην πρώτη σύνδεση θα ζητηθεί να αλλάξει." size={90} />
      <h3>{data.title}</h3>
      <div className="secret-box"><div><small>Όνομα χρήστη</small><code>{data.username}</code></div><div><small>Προσωρινός κωδικός</small><code className="big">{data.password}</code></div></div>
      <div className="btns"><button type="button" className="btn btn-primary" onClick={copy}>{copied ? '✔ Αντιγράφηκε' : '📋 Αντιγραφή στοιχείων'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => { if (copied || confirm('Ο κωδικός δεν θα ξαναεμφανιστεί. Τον κράτησες;')) onClose(); }}>Τον κράτησα, κλείσιμο</button></div>
    </div></div>
  );
}

function PermGrid({ me, value, onChange, disabled }) {
  return (
    <fieldset className="perm-grid" disabled={disabled}><legend>Δικαιώματα</legend>
      <div className="row wrap presets">{PRESETS.map(([l, keys]) => <button key={l} type="button" className="chip" onClick={() => onChange(Object.fromEntries(PERM_KEYS.map((k) => [k, keys.includes(k) && (isSuper(me) || (k !== 'admins' && can(me, k)))])))}>{l}</button>)}</div>
      {PERM_KEYS.map((k) => {
        const allowed = isSuper(me) || (k !== 'admins' && can(me, k));
        return <label key={k} className={`chk perm${allowed ? '' : ' locked'}`} title={allowed ? '' : 'Δεν μπορείς να δώσεις δικαίωμα που δεν έχεις'}>
          <input type="checkbox" checked={!!value?.[k]} disabled={!allowed} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} /> {PERMS[k]}{k === 'admins' && <small> — μπορεί να διαχειρίζεται διαχειριστές χωρίς αυτό το δικαίωμα</small>}{k === 'publish' && <small> — χωρίς αυτό, ό,τι γράφει μένει πρόχειρο</small>}</label>;
      })}
    </fieldset>
  );
}

export default function Admins({ me }) {
  const [rows, setRows] = useState(null), [edit, setEdit] = useState(null), [busy, setBusy] = useState(false), [secret, setSecret] = useState(null), [log, setLog] = useState(null), [logUser, setLogUser] = useState(0);
  const load = useCallback(() => api('/api/admin/admins').then(setRows).catch((e) => { toast(e.message, 'oops'); setRows([]); }), []);
  const loadLog = useCallback(() => api(`/api/admin/audit${logUser ? `?user=${logUser}` : ''}`).then(setLog).catch(() => setLog([])), [logUser]);
  useEffect(() => { load(); }, [load]); useEffect(() => { loadLog(); }, [loadLog]);
  const run = async (fn, ok) => { setBusy(true); try { await fn(); ok && toast(ok, 'happy'); await load(); loadLog(); } catch (e) { toast(e.message, 'oops'); } setBusy(false); };
  const save = (e) => {
    e.preventDefault();
    run(async () => {
      if (edit.id) { await api(`/api/admin/admins/${edit.id}`, { method: 'PUT', body: edit.self ? { name: edit.name, email: edit.email } : { name: edit.name, email: edit.email, permissions: edit.permissions } }); setEdit(null); }
      else { const r = await api('/api/admin/admins', { method: 'POST', body: edit }); setEdit(null); setSecret({ ...r, title: `Ο λογαριασμός «${r.username}» δημιουργήθηκε` }); }
    }, edit.id ? 'Οι αλλαγές αποθηκεύτηκαν.' : null);
  };
  const reset = (r) => {
    const twofa = r.totp_enabled && confirm(`Να απενεργοποιηθεί ΚΑΙ η επαλήθευση δύο βημάτων του «${r.username}»; (π.χ. αν έχασε το κινητό του)\n\nΟΚ = ναι, Άκυρο = μόνο κωδικός`);
    if (!confirm(`Νέος τυχαίος κωδικός για «${r.username}»; Θα αποσυνδεθεί από όλες τις συσκευές.`)) return;
    run(async () => { const j = await api(`/api/admin/admins/${r.id}/reset`, { method: 'POST', body: { twofa } }); setSecret({ username: r.username, password: j.password, title: `Νέος κωδικός για «${r.username}»` }); });
  };
  const toggle = (r) => run(() => api(`/api/admin/admins/${r.id}`, { method: 'PUT', body: { disabled: !r.disabled } }), r.disabled ? 'Ο λογαριασμός ενεργοποιήθηκε.' : 'Ο λογαριασμός απενεργοποιήθηκε και αποσυνδέθηκε.');
  const del = (r) => { if (prompt(`Για οριστική διαγραφή γράψε το όνομα χρήστη: ${r.username}`) !== r.username) return; run(() => api(`/api/admin/admins/${r.id}`, { method: 'DELETE' }), 'Ο λογαριασμός διαγράφηκε.'); };
  const names = useMemo(() => Object.fromEntries((rows || []).map((r) => [r.id, r.username || r.email])), [rows]);
  return (
    <div>
      <div className="adm-tools"><span className="grow" /><button type="button" className="btn btn-primary sm" onClick={() => setEdit({ username: '', email: '', name: '', permissions: Object.fromEntries(PERM_KEYS.map((k) => [k, EDITOR_PRESET.includes(k) && can(me, k)])) })}>+ Νέος διαχειριστής</button></div>
      {!rows ? <p className="muted">Φόρτωση…</p> : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Λογαριασμός</th><th>Ρόλος</th><th>Δικαιώματα</th><th>Κατάσταση</th><th>Τελ. σύνδεση</th><th className="r">Ενέργειες</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className={r.disabled ? 'dim' : ''}>
              <td><b>{r.name}</b>{r.self && <span className="pill"> εσύ</span>}<br /><small className="muted">@{r.username || '—'} · {r.email}</small></td>
              <td><span className={`pill ${r.role === 'superadmin' ? 'super' : 'published'}`}>{r.role === 'superadmin' ? '👑 ' : ''}{ROLE[r.role] || r.role}</span></td>
              <td className="small">{r.role === 'superadmin' ? 'Όλα (χωρίς περιορισμούς)' : PERM_KEYS.filter((k) => r.permissions?.[k]).length + ` / ${PERM_KEYS.length}`}</td>
              <td className="small">{r.disabled ? '⛔ Ανενεργός' : '✅ Ενεργός'}{r.must_change && <><br />🔑 Αναμένει αλλαγή κωδικού</>}{r.totp_enabled && <><br />🔐 2FA</>}</td>
              <td className="small">{fmtTime(r.last_login)}</td>
              <td className="r acts">{r.manageable ? <>
                <button type="button" className="btn btn-ghost sm" onClick={() => setLogUser(r.id)}>Ιστορικό</button>
                <button type="button" className="btn btn-ghost sm" disabled={busy} onClick={() => reset(r)}>Νέος κωδικός</button>
                <button type="button" className="btn btn-ghost sm" disabled={busy} onClick={() => toggle(r)}>{r.disabled ? 'Ενεργοποίηση' : 'Απενεργοποίηση'}</button>
                <button type="button" className="btn btn-danger sm" disabled={busy} onClick={() => del(r)}>Διαγραφή</button>
                <button type="button" className="btn btn-primary sm" onClick={() => setEdit({ ...r, permissions: { ...r.permissions } })}>Επεξεργασία</button></>
                : r.self ? <button type="button" className="btn btn-ghost sm" onClick={() => setEdit({ id: r.id, self: true, username: r.username, email: r.email, name: r.name })}>Όνομα / email</button>
                : <small className="muted">{r.role === 'superadmin' ? 'Προστατεύεται' : 'Μόνο ο Superadmin'}</small>}</td>
            </tr>))}</tbody></table></div>)}

      <h2 className="mt">Αρχείο ενεργειών {logUser ? <>του @{names[logUser]} <button type="button" className="linkbtn" onClick={() => setLogUser(0)}>(όλων)</button></> : ''}</h2>
      {!log ? <p className="muted">Φόρτωση…</p> : !log.length ? <p className="muted">Καμία καταγραφή.</p> : (
        <div className="tbl-wrap audit"><table className="tbl"><thead><tr><th>Πότε</th><th>Ποιος</th><th>Ενέργεια</th><th>Λεπτομέρειες</th></tr></thead>
          <tbody>{log.map((a) => <tr key={a.id}><td className="small nowrap">{fmtTime(a.ts)}</td><td>{a.user_name}</td><td><b>{a.action}</b></td><td className="small">{a.detail}</td></tr>)}</tbody></table></div>)}

      {edit && (
        <div className="drawer-back" onClick={() => !busy && setEdit(null)}>
          <form className="drawer" onSubmit={save} onClick={(e) => e.stopPropagation()} aria-label={edit.id ? 'Επεξεργασία διαχειριστή' : 'Νέος διαχειριστής'}>
            <div className="drawer-h"><h2>{edit.id ? `Επεξεργασία: @${edit.username}` : 'Νέος διαχειριστής'}</h2><button type="button" className="icon-btn" onClick={() => setEdit(null)} aria-label="Κλείσιμο">✕</button></div>
            <div className="drawer-b">
              {!edit.id && <p className="muted small">Ο κωδικός δημιουργείται αυτόματα (τυχαίος, 16 χαρακτήρων) και θα εμφανιστεί <b>μία φορά</b> μετά τη δημιουργία. Ο νέος διαχειριστής θα τον αλλάξει στην πρώτη σύνδεση.</p>}
              <div className="fld"><label htmlFor="a-u">Όνομα χρήστη<small>3–30 λατινικοί χαρακτήρες, αριθμοί, . _ -</small></label><input id="a-u" value={edit.username} disabled={!!edit.id} pattern="[A-Za-z0-9._\-]{3,30}" required autoCapitalize="none" onChange={(e) => setEdit({ ...edit, username: e.target.value.toLowerCase() })} /></div>
              <div className="fld"><label htmlFor="a-e">Email<small>Για επαναφορά κωδικού και ειδοποιήσεις ασφαλείας.</small></label><input id="a-e" type="email" value={edit.email} required onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
              <div className="fld"><label htmlFor="a-n">Εμφανιζόμενο όνομα</label><input id="a-n" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              {!edit.self && <PermGrid me={me} value={edit.permissions} onChange={(p) => setEdit({ ...edit, permissions: p })} />}
              {!isSuper(me) && !edit.self && <p className="muted small">Μπορείς να δώσεις μόνο δικαιώματα που έχεις κι εσύ. Τον ρόλο Superadmin δεν μπορεί να τον πάρει κανείς άλλος.</p>}
            </div>
            <div className="drawer-f"><span className="grow" /><button type="button" className="btn btn-ghost sm" onClick={() => setEdit(null)}>Ακύρωση</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Αποθήκευση…' : edit.id ? 'Αποθήκευση' : 'Δημιουργία λογαριασμού'}</button></div>
          </form>
        </div>)}
      {secret && <Secret data={secret} onClose={() => setSecret(null)} />}
    </div>
  );
}
