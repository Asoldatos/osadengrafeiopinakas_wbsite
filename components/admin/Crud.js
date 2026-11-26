'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, toast } from '@/lib/clientUpload';
import { Field, STATUS_OPTS } from './Fields';
import { MascotSay } from '../Mascot';
import { fmtDate } from '@/lib/util';

const SL = { draft: 'Πρόχειρο', published: 'Δημοσιευμένο', archived: 'Αρχειοθετημένο' };

/** Γενικός διαχειριστής εγγραφών: λίστα, αναζήτηση, φίλτρα, δημιουργία/επεξεργασία/διαγραφή. */
export default function Crud({ resource, noun, fields, columns, defaults = {}, statusFilter = false, reorder = false, previewPath, extraActions, emptyKey = 'empty', noNew = false, noToggle = false, studio = false }) {
  const [rows, setRows] = useState(null), [q, setQ] = useState(''), [st, setSt] = useState(''), [edit, setEdit] = useState(null), [busy, setBusy] = useState(false), [opts, setOpts] = useState({});
  const load = useCallback(() => api(`/api/admin/${resource}`).then(setRows).catch((e) => { toast(e.message, 'oops'); setRows([]); }), [resource]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fields.filter((f) => f.from).forEach((f) => api(`/api/admin/${f.from}`).then((r) => setOpts((o) => ({ ...o, [f.k]: r.map((x) => ({ v: x.id, l: x[f.labelKey || 'name'] })) }))).catch(() => {}));
  }, [fields]);
  const shown = useMemo(() => (rows || []).filter((r) => (!st || r.status === st) && (!q || JSON.stringify([r.title, r.name, r.role, r.slug]).toLowerCase().includes(q.toLowerCase()))), [rows, q, st]);
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setEdit((e) => ({ ...e, [k]: v })); setDirty(true); };
  const close = () => { if (busy) return; if (dirty && !confirm('Έχεις αλλαγές που δεν αποθηκεύτηκαν. Να κλείσει χωρίς αποθήκευση;')) return; setEdit(null); setDirty(false); };
  const open = (r) => { setEdit(r); setDirty(false); };
  const save = async (e) => {
    e?.preventDefault(); setBusy(true);
    try {
      const body = {}; fields.forEach((f) => { if (f.t !== 'static') body[f.k] = edit[f.k]; });
      const saved = edit.id ? await api(`/api/admin/${resource}/${edit.id}`, { method: 'PUT', body }) : await api(`/api/admin/${resource}`, { method: 'POST', body });
      toast(edit.id ? 'Αποθηκεύτηκε!' : `Δημιουργήθηκε: ${noun}`, edit.status === 'published' ? 'celebrate' : 'happy');
      setEdit(saved.id && !edit.id ? saved : { ...edit, ...saved }); setDirty(false); window.dispatchEvent(new CustomEvent('rx-saved')); await load();
    } catch (err) { toast(err.message, 'oops'); }
    setBusy(false);
  };
  const del = async (r) => {
    if (!confirm(`Να διαγραφεί οριστικά: «${r.title || r.name}»;\nΗ ενέργεια δεν αναιρείται.`)) return;
    try { await api(`/api/admin/${resource}/${r.id}`, { method: 'DELETE' }); toast('Διαγράφηκε.', 'oops'); setEdit(null); setDirty(false); load(); } catch (e) { toast(e.message, 'oops'); }
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
        {!noNew && <button type="button" className="btn btn-primary sm" onClick={() => open({ ...defaults })}>+ Νέο: {noun}</button>}
      </div>
      {!rows ? <p className="muted">Φόρτωση…</p> : !shown.length ? <MascotSay mood="confused" k={emptyKey} size={120} /> : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr>{columns.map((c) => <th key={c.k}>{c.label}</th>)}<th className="r">Ενέργειες</th></tr></thead>
          <tbody>{shown.map((r, i) => (
            <tr key={r.id}>
              {columns.map((c) => <td key={c.k}>{c.render ? c.render(r) : c.k === 'status' ? <span className={`pill ${r.status}`}>{SL[r.status]}</span> : c.date ? fmtDate(r[c.k]) : String(r[c.k] ?? '—')}</td>)}
              <td className="r acts">
                {reorder && <><button type="button" className="icon-btn sm" onClick={() => move(i, -1)} aria-label="Μετακίνηση πάνω">↑</button><button type="button" className="icon-btn sm" onClick={() => move(i, 1)} aria-label="Μετακίνηση κάτω">↓</button></>}
                {!noToggle && SL[r.status] && <button type="button" className="btn btn-ghost sm" onClick={() => toggle(r)}>{r.status === 'published' ? 'Απόκρυψη' : 'Δημοσίευση'}</button>}
                {previewPath && <a className="btn btn-ghost sm" href={previewPath(r)} target="_blank" rel="noopener noreferrer">Προεπισκόπηση</a>}
                {extraActions?.(r, load)}
                <button type="button" className="btn btn-primary sm" onClick={() => open({ ...r })}>Επεξεργασία</button>
              </td>
            </tr>))}</tbody></table></div>)}
      {edit && (
        <div className={`drawer-back${studio ? ' studio-back' : ''}`} onClick={close}>
          <form className={`drawer${studio ? ' studio' : ''}`} onSubmit={save} onClick={(e) => e.stopPropagation()} aria-label={edit.id ? `Επεξεργασία: ${noun}` : `Νέο: ${noun}`}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } }}>
            <div className="drawer-h"><h2>{edit.id ? 'Επεξεργασία' : 'Νέο'}: {noun}</h2>
              {studio && <span className={`studio-state${dirty ? ' dirty' : ''}`}>{busy ? 'Αποθήκευση…' : dirty ? 'Μη αποθηκευμένες αλλαγές' : edit.id ? 'Όλα αποθηκευμένα' : 'Νέο, δεν έχει αποθηκευτεί'}</span>}
              <span className="grow" />
              {studio && edit.id && previewPath && <a className="btn btn-ghost sm" href={previewPath(edit)} target="_blank" rel="noopener noreferrer">Προεπισκόπηση</a>}
              {studio && <button type="submit" className="btn btn-primary sm" disabled={busy}>{busy ? 'Αποθήκευση…' : 'Αποθήκευση'}<kbd>Ctrl S</kbd></button>}
              <button type="button" className="icon-btn" onClick={close} aria-label="Κλείσιμο">✕</button></div>
            {studio ? (
              <div className="studio-b">
                <div className="studio-main">{fields.filter((f) => f.main).map((f) => <Field key={f.k} f={f} value={edit[f.k]} onChange={(v) => set(f.k, v)} options={opts[f.k]} form={edit} />)}</div>
                <aside className="studio-side">{fields.filter((f) => !f.main && f.t !== 'static').map((f) => <Field key={f.k} f={f} value={edit[f.k]} onChange={(v) => set(f.k, v)} options={opts[f.k]} form={edit} />)}
                  {edit.id && <button type="button" className="btn btn-danger sm studio-del" onClick={() => del(edit)}>Διαγραφή άρθρου</button>}</aside>
              </div>) : <>
            <div className="drawer-b">{fields.map((f) => f.t === 'static' ? null : <Field key={f.k} f={f} value={edit[f.k]} onChange={(v) => set(f.k, v)} options={opts[f.k]} form={edit} />)}</div>
            <div className="drawer-f">
              {edit.id && <button type="button" className="btn btn-danger sm" onClick={() => del(edit)}>Διαγραφή</button>}
              <span className="grow" /><button type="button" className="btn btn-ghost sm" onClick={close}>Κλείσιμο</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Αποθήκευση…' : 'Αποθήκευση'}</button>
            </div></>}
          </form>
        </div>)}
    </div>
  );
}
