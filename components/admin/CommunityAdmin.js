'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, toast } from '@/lib/clientUpload';
import { fmtDate } from '@/lib/util';

const MB = (b) => `${(b / 1048576).toFixed(1)} MB`;
const FREE = 512 * 1048576;   // όριο δωρεάν πακέτου Neon
const ban = async (id, banned, after) => {
  if (!confirm(banned ? 'Ο μαθητής δεν θα μπορεί να σχολιάζει, να κάνει φίλους ή να στέλνει μηνύματα (και τα σχόλιά του θα κρυφτούν). Συνέχεια;' : 'Να επιτραπεί ξανά η χρήση της κοινότητας;')) return;
  try { await api('/api/admin/community/ban', { method: 'POST', body: { student_id: id, banned } }); toast(banned ? 'Ο μαθητής αποκλείστηκε από την κοινότητα.' : 'Ο αποκλεισμός άρθηκε.'); after?.(); } catch (e) { toast(e.message, 'oops'); }
};

function Overview() {
  const [d, setD] = useState(null), [s, setS] = useState(null);
  useEffect(() => { api('/api/admin/community').then((r) => { setD(r); setS(r.settings); }).catch((e) => toast(e.message, 'oops')); }, []);
  if (!d) return <p className="muted">Φόρτωση…</p>;
  const save = async () => { try { const r = await api('/api/admin/community', { method: 'PUT', body: s }); setS(r.settings); toast('Αποθηκεύτηκε!'); } catch (e) { toast(e.message, 'oops'); } };
  const T = ({ k, l }) => <label className="chk"><input type="checkbox" checked={!!s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} /> {l}</label>;
  const st = d.stats, pct = Math.min(100, Math.round((st.dbsize / FREE) * 100));
  return (
    <div className="cma-ov">
      <div className="cma-stats">{[['👁️', 'Προβολές', st.views], ['❤️', 'Likes', st.likes], ['💬', 'Σχόλια', st.comments], ['🙈', 'Κρυμμένα σχόλια', st.hidden], ['🤝', 'Φιλίες', st.friendships], ['✉️', 'Μηνύματα (αποθηκευμένα)', st.messages], ['🚩', 'Ανοιχτές αναφορές', st.reports], ['📮', 'Νέα αιτήματα', st.tickets], ['⛔', 'Αποκλεισμένοι', st.banned]].map(([i, l, n]) => <div key={l} className="card"><span>{i}</span><b>{n}</b><small>{l}</small></div>)}</div>
      <section className="card"><h2>Αποθηκευτικός χώρος βάσης</h2>
        <div className="x3-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: pct + '%', background: pct > 80 ? '#E5231B' : pct > 60 ? '#FFC21F' : '#2FA66A' }} /></div>
        <p>{MB(st.dbsize)} από ~512 MB (δωρεάν πακέτο Neon) · {pct}%</p>
        <p className="muted">Κάθε βράδυ γίνεται αυτόματος καθαρισμός: τα μηνύματα σβήνονται μετά από {s.retentionDays} ημέρες (και ποτέ δεν κρατιούνται πάνω από 150.000), οι ημερήσιες προβολές μετά από ~13 μήνες και τα κλειστά αιτήματα μετά από 1 χρόνο. Τα βίντεο είναι στο YouTube (0 MB εδώ).</p></section>
      <section className="card"><h2>Λειτουργίες</h2><p className="muted">Μπορείς να κλείσεις οποιαδήποτε λειτουργία αμέσως, π.χ. αν υπάρξει πρόβλημα.</p>
        <T k="views" l="Μετρητής προβολών" /><T k="likes" l="Likes στα άρθρα" /><T k="comments" l="Σχόλια στα άρθρα" /><T k="friends" l="Φίλοι" /><T k="messages" l="Μηνύματα μεταξύ φίλων (κρυπτογραφημένα)" /><T k="chat" l="Chat (chat.osaden.gr: servers & κανάλια)" /><T k="calls" l="Κλήσεις μεταξύ φίλων" /><T k="video" l="Βιντεοκλήσεις" />
        <div className="cma-nums">
          <div className="fld"><label htmlFor="cm-r">Διαγραφή μηνυμάτων μετά από (ημέρες, 3–30)</label><input id="cm-r" type="number" min={3} max={30} value={s.retentionDays} onChange={(e) => setS({ ...s, retentionDays: e.target.value })} /></div>
          <div className="fld"><label htmlFor="cm-cr">Διαγραφή μηνυμάτων καναλιών μετά από (ημέρες, 7–365)</label><input id="cm-cr" type="number" min={7} max={365} value={s.chatRetentionDays} onChange={(e) => setS({ ...s, chatRetentionDays: e.target.value })} /></div>
          <div className="fld"><label htmlFor="cm-h">Αυτόματη απόκρυψη σχολίου μετά από (αναφορές)</label><input id="cm-h" type="number" min={1} max={10} value={s.autoHideReports} onChange={(e) => setS({ ...s, autoHideReports: e.target.value })} /></div>
          <div className="fld"><label htmlFor="cm-m">Μέγιστα μηνύματα ανά μαθητή την ημέρα</label><input id="cm-m" type="number" min={20} max={500} value={s.maxMessagesPerDay} onChange={(e) => setS({ ...s, maxMessagesPerDay: e.target.value })} /></div>
        </div>
        <button type="button" className="btn btn-primary sm" onClick={save}>Αποθήκευση</button></section>
      <FilterSettings s={s} setS={setS} save={save} />
      <section className="card"><h2>🛡️ Πώς προστατεύονται οι μαθητές</h2><ul className="plain">
        <li>• Μηνύματα στέλνονται <b>μόνο μεταξύ φίλων</b>, με αίτημα που πρέπει να γίνει αποδεκτό. Η αναζήτηση γίνεται μόνο με το ακριβές όνομα χρήστη (δεν υπάρχει κατάλογος μαθητών).</li>
        <li>• Αυτόματο φίλτρο για βρισιές και για <b>κάθε στοιχείο επικοινωνίας εκτός ιστοτόπου</b>: σύνδεσμοι, email, τηλέφωνα, @λογαριασμοί, ονόματα άλλων εφαρμογών (στα μηνύματα).</li>
        <li>• Χωρίς εικόνες και αρχεία στα μηνύματα. Όρια ρυθμού σε σχόλια, μηνύματα και αιτήματα φιλίας.</li>
        <li>• Μπλοκ και Αναφορά παντού. Οι διαχειριστές βλέπουν <b>μόνο</b> συνομιλίες που αναφέρθηκαν, ποτέ όλα τα μηνύματα.</li></ul></section>
    </div>
  );
}
function FilterSettings({ s, setS, save }) {
  const [txt, setTxt] = useState(''), [res, setRes] = useState(null);
  const lines = (v) => (Array.isArray(v) ? v.join('\n') : v || '');
  const test = async () => { try { setRes(await api('/api/admin/community/filter-test', { method: 'POST', body: { text: txt, settings: s } })); } catch (e) { toast(e.message, 'oops'); } };
  const show = (r) => r.error ? <><b style={{ color: '#b3261e' }}>⛔ Δεν δημοσιεύεται</b>{r.terms && <> · {r.terms.map((x) => `«${x.term}» (${x.rule})`).join(', ')}</>}{r.rule && <> · κανόνας: {r.rule}</>}</>
    : r.flag ? <><b style={{ color: '#9a6b00' }}>🤖 Δημοσιεύεται, πάει για έλεγχο</b> · {r.flag.map((x) => `«${x.term}» (${x.rule})`).join(', ')}</> : <b style={{ color: '#17803d' }}>✅ Εντάξει</b>;
  return (
    <section className="card"><h2>🧹 Φίλτρο λέξεων (Ελληνικά + Αγγλικά)</h2>
      <p className="muted">Ελέγχει ολόκληρες λέξεις και φράσεις (όχι κομμάτια λέξεων), με τόνους/κεφαλαία, επαναλήψεις («μαλαααακας»), διαχωριστικά («π ο υ τ σ α», «f.u.c.k»), leetspeak («sh1t», «π0υτσ@»), μάσκες («f*ck») και γράμματα από άλλα αλφάβητα. Σύνδεσμοι, email, τηλέφωνα και @λογαριασμοί κόβονται πάντα.</p>
      <div className="cma-nums">
        <div className="fld"><label htmlFor="cf-l">Αυστηρότητα</label><select id="cf-l" value={s.filterLevel} onChange={(e) => setS({ ...s, filterLevel: e.target.value })}><option value="strict">Βασικό: μόνο ακριβείς λέξεις</option><option value="balanced">Ισορροπημένο: + επαναλήψεις και διαχωριστικά</option><option value="aggressive">Αυστηρό: + leetspeak, μάσκες, ομοιόγλυφα (προτείνεται)</option></select></div>
        <div className="fld"><label htmlFor="cf-sc">Ήπιες λέξεις στα σχόλια (π.χ. «ηλίθιος», «damn»)</label><select id="cf-sc" value={s.softComments} onChange={(e) => setS({ ...s, softComments: e.target.value })}><option value="flag">Δημοσίευση + έλεγχος από διαχειριστή (προτείνεται)</option><option value="block">Να μπλοκάρονται</option><option value="allow">Να επιτρέπονται</option></select></div>
        <div className="fld"><label htmlFor="cf-sm">Ήπιες λέξεις στα μηνύματα</label><select id="cf-sm" value={s.softMessages} onChange={(e) => setS({ ...s, softMessages: e.target.value })}><option value="allow">Να επιτρέπονται</option><option value="block">Να μπλοκάρονται</option></select></div>
      </div>
      <div className="cma-nums">
        <div className="fld"><label htmlFor="cf-b">Επιπλέον λέξεις που μπλοκάρονται (μία ανά γραμμή)</label><textarea id="cf-b" rows={5} value={lines(s.blockWords)} onChange={(e) => setS({ ...s, blockWords: e.target.value })} placeholder={'π.χ. ένα παρατσούκλι που χρησιμοποιείται για κοροϊδία'} /></div>
        <div className="fld"><label htmlFor="cf-a">Λέξεις που επιτρέπονται πάντα (μία ανά γραμμή)</label><textarea id="cf-a" rows={5} value={lines(s.allowWords)} onChange={(e) => setS({ ...s, allowWords: e.target.value })} placeholder={'π.χ. ένα όνομα ή όρος που κόβεται κατά λάθος'} /></div>
      </div>
      <button type="button" className="btn btn-primary sm" onClick={save}>Αποθήκευση φίλτρου</button>
      <div className="fld" style={{ marginTop: 18 }}><label htmlFor="cf-t">Δοκίμασε μια φράση (με τις ρυθμίσεις παραπάνω, χωρίς αποθήκευση)</label>
        <div className="fr-form"><input id="cf-t" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Γράψε κάτι…" /><button type="button" className="btn btn-ghost sm" onClick={test} disabled={!txt.trim()}>Δοκιμή</button></div></div>
      {res && <p>Σχόλια: {show(res.comments)}<br />Μηνύματα: {show(res.messages)}</p>}
    </section>
  );
}
function Comments() {
  const [f, setF] = useState('reported'), [rows, setRows] = useState(null);
  const load = useCallback(() => api(`/api/admin/community/comments?f=${f}`).then(setRows).catch((e) => toast(e.message, 'oops')), [f]);
  useEffect(() => { load(); }, [load]);
  const set = async (id, status) => { try { await api('/api/admin/community/comments', { method: 'PUT', body: { id, status } }); load(); } catch (e) { toast(e.message, 'oops'); } };
  return (<>
    <div className="adm-tools">{[['reported', 'Με αναφορές / φίλτρο'], ['hidden', 'Κρυμμένα'], ['all', 'Όλα']].map(([k, l]) => <button key={k} type="button" className={`btn sm ${f === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setF(k)}>{l}</button>)}</div>
    {!rows ? <p className="muted">Φόρτωση…</p> : !rows.length ? <p className="muted">Τίποτα για έλεγχο. 🎉</p> : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Σχόλιο</th><th>Μαθητής</th><th>Άρθρο</th><th>🚩</th><th>Κατάσταση</th><th className="r">Ενέργειες</th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id}><td style={{ maxWidth: 380 }}>{r.body}<br /><small className="muted">{fmtDate(r.created_at)}</small>{r.auto_flag && <><br /><small title="Ήπιοι όροι που βρήκε το φίλτρο">🤖 {r.auto_flag}</small></>}</td><td><b>{r.nickname}</b>{r.community_banned && ' ⛔'}</td><td><a href={`/articles/${r.slug}#comments`} target="_blank" rel="noopener noreferrer">{r.article}</a></td><td>{r.reports}</td>
        <td><span className={`pill ${r.status === 'visible' ? 'published' : 'archived'}`}>{r.status === 'visible' ? 'Ορατό' : 'Κρυμμένο'}</span></td>
        <td className="r acts">{r.status === 'visible' ? <button type="button" className="btn btn-ghost sm" onClick={() => set(r.id, 'hidden')}>Απόκρυψη</button> : <button type="button" className="btn btn-ghost sm" onClick={() => set(r.id, 'visible')}>Εμφάνιση</button>}
          <button type="button" className="btn btn-danger sm" onClick={() => confirm('Να διαγραφεί το σχόλιο;') && set(r.id, 'deleted')}>Διαγραφή</button>
          <button type="button" className="btn btn-ghost sm" onClick={() => ban(r.student_id, !r.community_banned, load)}>{r.community_banned ? 'Άρση αποκλεισμού' : 'Αποκλεισμός μαθητή'}</button></td></tr>)}</tbody></table></div>}
  </>);
}
function Reports() {
  const [all, setAll] = useState(false), [rows, setRows] = useState(null), [note, setNote] = useState({});
  const load = useCallback(() => api(`/api/admin/community/reports${all ? '?s=all' : ''}`).then(setRows).catch((e) => toast(e.message, 'oops')), [all]);
  useEffect(() => { load(); }, [load]);
  const resolve = async (r, status) => { try { await api('/api/admin/community/reports', { method: 'PUT', body: { id: r.id, status, note: note[r.id] ?? r.note } }); load(); } catch (e) { toast(e.message, 'oops'); } };
  return (<>
    <div className="adm-tools"><button type="button" className={`btn sm ${!all ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAll(false)}>Ανοιχτές</button><button type="button" className={`btn sm ${all ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAll(true)}>Όλες</button></div>
    <p className="muted">⚠️ Αν μια αναφορά δείχνει ότι ένα παιδί κινδυνεύει, ενημέρωσε <b>αμέσως</b> τη διεύθυνση του σχολείου. Στην Ελλάδα: Δίωξη Ηλεκτρονικού Εγκλήματος 11188 · Χαμόγελο του Παιδιού 1056.</p>
    {!rows ? <p className="muted">Φόρτωση…</p> : !rows.length ? <p className="muted">Καμία αναφορά. 🎉</p> : rows.map((r) => (
      <article key={r.id} className="card cma-rep"><header><b>#{r.id}</b> · {fmtDate(r.created_at)} · <span className={`pill ${r.status === 'open' ? 'draft' : 'published'}`}>{r.status === 'open' ? 'Ανοιχτή' : 'Επιλύθηκε'}</span>
        <p>Ο/Η <b>{r.reporter || '(διαγραμμένος)'}</b> ανέφερε τον/την <b>{r.reported || '(διαγραμμένος)'}</b>{r.reported_banned && ' ⛔'}: <i>{r.reason}</i></p></header>
        <ol className="cma-snap">{(r.snapshot || []).length ? r.snapshot.map((m, i) => <li key={i} className={m.nickname === r.reporter ? 'a' : 'b'}><b>{m.nickname}</b> <small>{fmtDate(m.created_at)}</small><p>{m.body}</p></li>) : <li className="muted">Δεν υπήρχαν μηνύματα.</li>}</ol>
        <div className="fld"><label htmlFor={`rn${r.id}`}>Σημείωση διαχειριστή</label><input id={`rn${r.id}`} value={note[r.id] ?? r.note} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })} maxLength={1000} /></div>
        <div className="btns">{r.status === 'open' ? <button type="button" className="btn btn-primary sm" onClick={() => resolve(r, 'resolved')}>Σήμανση ως επιλυμένη</button> : <button type="button" className="btn btn-ghost sm" onClick={() => resolve(r, 'open')}>Ξανά ανοιχτή</button>}
          {r.reported_id && <button type="button" className="btn btn-danger sm" onClick={() => ban(r.reported_id, !r.reported_banned, load)}>{r.reported_banned ? 'Άρση αποκλεισμού' : `Αποκλεισμός ${r.reported}`}</button>}</div></article>))}
  </>);
}
export default function CommunityAdmin() {
  const sp = useSearchParams(); const [tab, setTab] = useState(sp.get('tab') || 'overview');
  return (<>
    <div className="adm-tools">{[['overview', '📊 Επισκόπηση & ρυθμίσεις'], ['comments', '💬 Σχόλια'], ['reports', '🚩 Αναφορές συνομιλιών']].map(([k, l]) => <button key={k} type="button" className={`btn sm ${tab === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'overview' ? <Overview /> : tab === 'comments' ? <Comments /> : <Reports />}
  </>);
}
