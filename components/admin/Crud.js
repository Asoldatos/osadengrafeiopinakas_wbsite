'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, toast } from '@/lib/clientUpload';
import { Field, STATUS_OPTS } from './Fields';
import { MascotSay } from '../Mascot';
import { fmtDate } from '@/lib/util';

const SL = { draft: 'Πρόχειρο', published: 'Δημοσιευμένο', archived: 'Αρχειοθετημένο' };

/** Γενικός διαχειριστής εγγραφών: λίστα, αναζήτηση, φίλτρα, δημιουργία/επεξεργασία/διαγραφή. */
export default function Crud({ resource, noun, fields, columns, defaults = {}, statusFilter = false, reorder = false, previewPath, extraActions, emptyKey = 'empty', noNew = false }) {
  const [rows, setRows] = useState(null), [q, setQ] = useState(''), [st, setSt] = useState(''), [edit, setEdit] = useState(null), [busy, setBusy] = useState(false), [opts, setOpts] = useState({});
  const load = useCallback(() => api(`/api/admin/${resource}`).then(setRows).catch((e) => { toast(e.message, 'oops'); setRows([]); }), [resource]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fields.filter((f) => f.from).forEach((f) => api(`/api/admin/${f.from}`).then((r) => setOpts((o) => ({ ...o, [f.k]: r.map((x) => ({ v: x.id, l: x[f.labelKey || 'name'] })) }))).catch(() => {}));
  }, [fields]);
  const shown = useMemo(() => (rows || []).filter((r) => (!st || r.status === st) && (!q || JSON.stringify([r.title, r.name, r.role, r.slug]).toLowerCase().includes(q.toLowerCase()))), [rows, q, st]);
  const set = (k, v) => setEdit((e) => ({ ...e, [k]: v }));
  const save = async (e) => {
    e?.preventDefault(); setBusy(true);
    try {
      const body = {}; fields.forEach((f) => { if (f.t !== 'static') body[f.k] = edit[f.k]; });
      const saved = edit.id ? await api(`/api/admin/${resource}/${edit.id}`, { method: 'PUT', body }) : await api(`/api/admin/${resource}`, { method: 'POST', body });
      toast(edit.id ? 'Αποθηκεύτηκε!' : `Δημιουργήθηκε: ${noun}`, edit.status === 'published' ? 'celebrate' : 'happy');
      setEdit(saved.id && !edit.id ? saved : { ...edit, ...saved }); await load();
    } catch (err) { toast(err.message, 'oops'); }
    setBusy(false);
  };
  const del = async (r) => {
    if (!confirm(`Να διαγραφεί οριστικά: «${r.title || r.name}»;\nΗ ενέργεια δεν αναιρείται.`)) return;
    try { await api(`/api/admin/${resource}/${r.id}`, { method: 'DELETE' }); toast('Διαγράφηκε.', 'oops'); setEdit(null); load(); } catch (e) { toast(e.message, 'oops'); }
  };
  const toggle = async (r) => {
    const status = r.status === 'published' ? 'draft' : 'published';
    try { await api(`/api/admin/${resource}/${r.id}`, { method: 'PUT', body: { status } }); toast(status === 'published' ? 'Δημοσιεύτηκε! Ο πίνακας τα έγραψε όλα.' : 'Το στοιχείο έγινε πρόχειρο.', status === 'published' ? 'celebrate' : 'happy'); load(); } catch (e) { toast(e.message, 'oops'); }
  };
  const move = async (i, d) => {
    const j = i + d; if (j < 0 || j >= shown.length) return;
    const a = shown[i], b = shown[j];
    try { await api(`/api/admin/${resource}/${a.id}`, { method: 'PUT', body: { sort: j } }); await api(`/api/admin/${resource}/${b.id}`, { method: 'PUT', body: { sort: i } }); load(); } catch (e) { toast(e.message, 'oops'); }
  };
  return (
    <div>
      <div className="adm-tools">
        <input type="search" placeholder="Αναζήτηση…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Αναζήτηση" />
        {statusFilter && <select value={st} onChange={(e) => setSt(e.target.value)} aria-label="Φίλτρο κατάστασης"><option value="">Όλες οι καταστάσεις</option>{STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>}
        {!noNew && <button type="button" className="btn btn-primary sm" onClick={() => setEdit({ ...defaults })}>+ Νέο: {noun}</button>}
      </div>
      {!rows ? <p className="muted">Φόρτωση…</p> : !shown.length ? <MascotSay mood="confused" k={emptyKey} size={120} /> : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr>{columns.map((c) => <th key={c.k}>{c.label}</th>)}<th className="r">Ενέργειες</th></tr></thead>
          <tbody>{shown.map((r, i) => (
            <tr key={r.id}>
              {columns.map((c) => <td key={c.k}>{c.render ? c.render(r) : c.k === 'status' ? <span className={`pill ${r.status}`}>{SL[r.status]}</span> : c.date ? fmtDate(r[c.k]) : String(r[c.k] ?? '—')}</td>)}
              <td className="r acts">
                {reorder && <><button type="button" className="icon-btn sm" onClick={() => move(i, -1)} aria-label="Μετακίνηση πάνω">↑</button><button type="button" className="icon-btn sm" onClick={() => move(i, 1)} aria-label="Μετακίνηση κάτω">↓</button></>}
                {r.status !== undefined && r.status !== null && <button type="button" className="btn btn-ghost sm" onClick={() => toggle(r)}>{r.status === 'published' ? 'Απόκρυψη' : 'Δημοσίευση'}</button>}
                {previewPath && <a className="btn btn-ghost sm" href={previewPath(r)} target="_blank" rel="noopener noreferrer">Προεπισκόπηση</a>}
                {extraActions?.(r)}
                <button type="button" className="btn btn-primary sm" onClick={() => setEdit({ ...r })}>Επεξεργασία</button>
              </td>
            </tr>))}</tbody></table></div>)}
      {edit && (
        <div className="drawer-back" onClick={() => !busy && setEdit(null)}>
          <form className="drawer" onSubmit={save} onClick={(e) => e.stopPropagation()} aria-label={edit.id ? `Επεξεργασία: ${noun}` : `Νέο: ${noun}`}>
            <div className="drawer-h"><h2>{edit.id ? 'Επεξεργασία' : 'Νέο'}: {noun}</h2><button type="button" className="icon-btn" onClick={() => setEdit(null)} aria-label="Κλείσιμο">✕</button></div>
            <div className="drawer-b">{fields.map((f) => f.t === 'static' ? null : <Field key={f.k} f={f} value={edit[f.k]} onChange={(v) => set(f.k, v)} options={opts[f.k]} />)}</div>
            <div className="drawer-f">
              {edit.id && <button type="button" className="btn btn-danger sm" onClick={() => del(edit)}>Διαγραφή</button>}
              <span className="grow" /><button type="button" className="btn btn-ghost sm" onClick={() => setEdit(null)}>Κλείσιμο</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Αποθήκευση…' : 'Αποθήκευση'}</button>
            </div>
          </form>
        </div>)}
    </div>
  );
}
