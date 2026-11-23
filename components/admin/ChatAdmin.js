'use client';
import { useCallback, useEffect, useState } from 'react';
import Crud from './Crud';
import { STATUS_OPTS } from './Fields';
import { api, toast } from '@/lib/clientUpload';
import { fmtDate } from '@/lib/util';

const serverFields = [
  { k: 'name', label: 'Όνομα server', t: 'text' }, { k: 'icon', label: 'Εικονίδιο (emoji)', t: 'text', hint: 'π.χ. 📰 🎮 🏀 🎨' },
  { k: 'color', label: 'Χρώμα', t: 'color' }, { k: 'description', label: 'Περιγραφή (φαίνεται στην Εξερεύνηση)', t: 'area', rows: 3 },
  { k: 'rules', label: 'Κανόνες (ένας ανά γραμμή· οι μαθητές πρέπει να τους αποδεχτούν για να μπουν)', t: 'area', rows: 8 },
  { k: 'status', label: 'Κατάσταση (μόνο οι «Δημοσιευμένοι» φαίνονται στους μαθητές)', t: 'select', opts: STATUS_OPTS }, { k: 'slug', label: 'Αναγνωριστικό (slug)', t: 'text', hint: 'Αφήστε κενό για αυτόματο.' },
];
const serverCols = [{ k: 'icon', label: '', render: (r) => <span style={{ fontSize: 26 }}>{r.icon}</span> }, { k: 'name', label: 'Server', render: (r) => <b style={{ borderLeft: `6px solid ${r.color}`, paddingLeft: 8 }}>{r.name}</b> }, { k: 'status', label: 'Κατάσταση' }, { k: 'members', label: 'Μέλη' }, { k: 'channels', label: 'Κανάλια' }];
const channelFields = [
  { k: 'server_id', label: 'Server', t: 'select', from: 'chat_servers', labelKey: 'name', num: true }, { k: 'name', label: 'Όνομα καναλιού', t: 'text', hint: 'π.χ. 💬-γενικά (τα κενά γίνονται παύλες)' },
  { k: 'topic', label: 'Θέμα', t: 'text' }, { k: 'readonly', label: 'Μόνο ανακοινώσεις (γράφουν μόνο οι διαχειριστές)', t: 'bool' },
  { k: 'slowmode', label: 'Αργή λειτουργία (δευτερόλεπτα ανάμεσα σε μηνύματα, 0 = κανονικά)', t: 'num' },
];
const channelCols = [{ k: 'server_name', label: 'Server' }, { k: 'name', label: 'Κανάλι', render: (r) => <b>{r.readonly ? '📢' : '#'} {r.name}</b> }, { k: 'topic', label: 'Θέμα' }, { k: 'slowmode', label: '🐢', render: (r) => (r.slowmode ? `${r.slowmode}″` : '—') }];

function Moderate() {
  const [tree, setTree] = useState(null), [ch, setCh] = useState(0), [rows, setRows] = useState(null), [ann, setAnn] = useState(''), [as, setAs] = useState('Η σύνταξη');
  const loadTree = useCallback(() => api('/api/admin/chat').then((t) => { setTree(t); if (!ch) setCh(t.flatMap((s) => s.channels)[0]?.id || 0); }).catch((e) => toast(e.message, 'oops')), [ch]);
  useEffect(() => { loadTree(); }, []); // eslint-disable-line
  const load = useCallback(() => ch && api(`/api/admin/chat/messages?channel=${ch}`).then(setRows).catch((e) => toast(e.message, 'oops')), [ch]);
  useEffect(() => { load(); }, [load]);
  const server = tree?.find((s) => s.channels.some((c) => c.id === ch));
  const seed = async () => { try { await api('/api/admin/chat', { method: 'POST', body: { action: 'seed' } }); toast('Ο server δημιουργήθηκε ως «Πρόχειρο». Δημοσίευσέ τον από την καρτέλα Servers!', 'celebrate'); loadTree(); } catch (e) { toast(e.message, 'oops'); } };
  const del = async (r, deleted) => { try { await api('/api/admin/chat/messages', { method: 'PUT', body: { id: r.id, deleted } }); load(); } catch (e) { toast(e.message, 'oops'); } };
  const mute = async (r) => { const m = prompt('Σίγαση για πόσα λεπτά; (0 = άρση σίγασης) π.χ. 60, 1440 (1 ημέρα)', '60'); if (m === null) return; try { await api('/api/admin/chat/messages', { method: 'PUT', body: { mute: { server_id: server.id, student_id: r.student_id, minutes: +m } } }); toast('Έγινε!'); load(); } catch (e) { toast(e.message, 'oops'); } };
  const post = async () => { try { await api('/api/admin/chat/messages', { method: 'POST', body: { channel: ch, body: ann, as } }); setAnn(''); load(); toast('Στάλθηκε!'); } catch (e) { toast(e.message, 'oops'); } };
  if (!tree) return <p className="muted">Φόρτωση…</p>;
  return (<>
    {!tree.some((s) => s.name === 'Όσα δεν γράφει ο πίνακας') && <div className="card"><h2>Γρήγορη αρχή</h2><p>Φτιάξε με ένα κλικ τον επίσημο server της εφημερίδας με κανάλια (#📢-ανακοινώσεις, #💬-γενικά, #📰-άρθρα, #💡-ιδέες, #🎮-παιχνίδια, #🆘-βοήθεια) και έτοιμους κανόνες.</p><button type="button" className="btn btn-primary sm" onClick={seed}>Δημιουργία server «Όσα δεν γράφει ο πίνακας»</button></div>}
    {!tree.length ? <p className="muted">Δεν υπάρχουν servers ακόμα.</p> : <>
      <div className="fld"><label htmlFor="chm-c">Κανάλι</label><select id="chm-c" value={ch} onChange={(e) => setCh(+e.target.value)}>{tree.map((s) => <optgroup key={s.id} label={`${s.icon} ${s.name}${s.status !== 'published' ? ' (μη δημοσιευμένος)' : ''}`}>{s.channels.map((c) => <option key={c.id} value={c.id}>{c.readonly ? '📢' : '#'} {c.name}</option>)}</optgroup>)}</select></div>
      <div className="card"><h3>📢 Μήνυμα της σύνταξης σε αυτό το κανάλι</h3><div className="cma-nums"><div className="fld"><label htmlFor="chm-as">Υπογραφή</label><input id="chm-as" value={as} onChange={(e) => setAs(e.target.value)} maxLength={60} /></div></div>
        <div className="fld"><label htmlFor="chm-t">Κείμενο</label><textarea id="chm-t" rows={3} value={ann} onChange={(e) => setAnn(e.target.value)} maxLength={2000} /></div><button type="button" className="btn btn-primary sm" disabled={!ann.trim() || !ch} onClick={post}>Αποστολή</button></div>
      {!rows ? <p className="muted">Φόρτωση…</p> : !rows.length ? <p className="muted">Κανένα μήνυμα σε αυτό το κανάλι.</p> : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Μήνυμα</th><th>Από</th><th>Πότε</th><th className="r">Ενέργειες</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id} style={r.deleted ? { opacity: 0.5 } : undefined}><td style={{ maxWidth: 420, whiteSpace: 'pre-wrap' }}>{r.deleted ? <i>(διαγραμμένο)</i> : r.body}</td>
          <td>{r.staff_name ? <b>✏️ {r.staff_name}</b> : <>{r.nickname}{r.community_banned && ' ⛔'}{r.muted_until && new Date(r.muted_until) > new Date() && ' 🔇'}</>}</td><td>{fmtDate(r.created_at)}</td>
          <td className="r acts">{r.deleted ? <button type="button" className="btn btn-ghost sm" onClick={() => del(r, false)}>Επαναφορά</button> : <button type="button" className="btn btn-danger sm" onClick={() => del(r, true)}>Διαγραφή</button>}
            {r.student_id && <button type="button" className="btn btn-ghost sm" onClick={() => mute(r)}>Σίγαση</button>}</td></tr>)}</tbody></table></div>}
    </>}
  </>);
}
export default function ChatAdmin() {
  const [tab, setTab] = useState('mod');
  return (<>
    <div className="adm-tools">{[['mod', '🛡️ Συντονισμός & ανακοινώσεις'], ['servers', '🖥️ Servers'], ['channels', '# Κανάλια']].map(([k, l]) => <button key={k} type="button" className={`btn sm ${tab === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(k)}>{l}</button>)}
      <a className="btn btn-ghost sm" href="/chat" target="_blank" rel="noopener noreferrer">Άνοιγμα chat ↗</a></div>
    {tab === 'mod' ? <Moderate /> : tab === 'servers' ? <Crud resource="chat_servers" noun="server" fields={serverFields} columns={serverCols} reorder defaults={{ status: 'draft', icon: '💬', color: '#5865F2' }} />
      : <Crud resource="chat_channels" noun="κανάλι" fields={channelFields} columns={channelCols} reorder defaults={{ slowmode: 0, readonly: false }} />}
  </>);
}
