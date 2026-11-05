'use client';
import { useEffect, useRef, useState } from 'react';
import { api, toast, uploadImage, uploadPdf } from '@/lib/clientUpload';

export function MediaPicker({ onPick, onClose }) {
  const [rows, setRows] = useState(null), [q, setQ] = useState(''), [prog, setProg] = useState(null);
  const load = () => api('/api/admin/media' + (q ? `?q=${encodeURIComponent(q)}` : '')).then((r) => setRows(r.filter((x) => x.mime.startsWith('image/')))).catch((e) => toast(e.message, 'oops'));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);
  const up = async (f) => { if (!f) return; try { setProg(0); const r = await uploadImage(f, { onProgress: setProg }); toast('Η εικόνα ανέβηκε!'); onPick(r.url); } catch (e) { toast(e.message, 'oops'); } setProg(null); };
  return (
    <div className="modal-back" onClick={onClose}><div className="modal wide" role="dialog" aria-modal="true" aria-label="Βιβλιοθήκη πολυμέσων" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="modal-x" onClick={onClose} aria-label="Κλείσιμο">✕</button><h3>Επιλογή εικόνας</h3>
      <div className="row"><input placeholder="Αναζήτηση…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Αναζήτηση εικόνων" />
        <label className="btn btn-primary sm">Νέα εικόνα<input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={(e) => up(e.target.files[0])} /></label></div>
      {prog !== null && <div className="bar"><span style={{ width: `${prog * 100}%` }} /></div>}
      {!rows ? <p>Φόρτωση…</p> : !rows.length ? <p className="muted">Δεν υπάρχουν εικόνες ακόμα. Ανέβασε την πρώτη!</p> : <div className="mgrid">{rows.map((m) => <button key={m.id} type="button" className="mitem" onClick={() => onPick(m.url)} title={m.name}><img src={m.url} alt={m.alt || m.name} loading="lazy" /><span>{m.name}</span></button>)}</div>}
    </div></div>
  );
}
export function ImageField({ value, onChange }) {
  const [pick, setPick] = useState(false);
  return (
    <div className="imgf">
      {value ? <img src={value} alt="" className="imgf-prev" /> : <div className="imgf-prev empty">Χωρίς εικόνα</div>}
      <div className="col"><button type="button" className="btn btn-ghost sm" onClick={() => setPick(true)}>{value ? 'Αλλαγή' : 'Επιλογή εικόνας'}</button>
        {value && <button type="button" className="btn btn-ghost sm" onClick={() => onChange('')}>Αφαίρεση</button>}</div>
      {pick && <MediaPicker onClose={() => setPick(false)} onPick={(u) => { onChange(u); setPick(false); }} />}
    </div>
  );
}
export function PdfField({ value, onChange }) {
  const [p, setP] = useState(null);
  const go = async (f) => { if (!f) return; try { setP(0); onChange(await uploadPdf(f, { onProgress: setP })); toast('Το PDF ανέβηκε!'); } catch (e) { toast(e.message, 'oops'); } setP(null); };
  return (
    <div className="pdff">
      {value ? <p className="ok">✔ Υπάρχει αρχείο PDF</p> : <p className="muted">Δεν έχει ανέβει αρχείο.</p>}
      <label className="btn btn-ghost sm">{value ? 'Αντικατάσταση PDF' : 'Επιλογή PDF'}<input type="file" hidden accept="application/pdf,.pdf" onChange={(e) => go(e.target.files[0])} /></label>
      {value && <button type="button" className="btn btn-ghost sm" onClick={() => onChange('')}>Αφαίρεση</button>}
      {p !== null && <div className="bar"><span style={{ width: `${p * 100}%` }} /></div>}
    </div>
  );
}
export function HtmlEditor({ value, onChange }) {
  const ref = useRef(null); const [pick, setPick] = useState(false);
  useEffect(() => { const el = ref.current; if (el && el.innerHTML !== (value || '') && document.activeElement !== el) el.innerHTML = value || ''; }, [value]);
  const cmd = (c, a) => { ref.current.focus(); document.execCommand(c, false, a); onChange(ref.current.innerHTML); };
  const B = ({ c, a, children, t }) => <button type="button" className="tb" title={t} aria-label={t} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd(c, a)}>{children}</button>;
  return (
    <div className="rte">
      <div className="rte-bar" role="toolbar" aria-label="Μορφοποίηση κειμένου">
        <B c="bold" t="Έντονα"><b>Β</b></B><B c="italic" t="Πλάγια"><i>Π</i></B><B c="underline" t="Υπογράμμιση"><u>Υ</u></B>
        <B c="formatBlock" a="h2" t="Τίτλος">Τ1</B><B c="formatBlock" a="h3" t="Υπότιτλος">Τ2</B><B c="formatBlock" a="p" t="Κανονική παράγραφος">¶</B>
        <B c="insertUnorderedList" t="Λίστα">• ―</B><B c="insertOrderedList" t="Αριθμημένη λίστα">1.</B><B c="formatBlock" a="blockquote" t="Παράθεμα">❝</B>
        <button type="button" className="tb" title="Σύνδεσμος" onMouseDown={(e) => e.preventDefault()} onClick={() => { const u = prompt('Διεύθυνση συνδέσμου (https://…)'); if (u) cmd('createLink', u); }}>🔗</button>
        <button type="button" className="tb" title="Εικόνα" onMouseDown={(e) => e.preventDefault()} onClick={() => { ref.current.focus(); setPick(true); }}>🖼️</button>
        <B c="insertHorizontalRule" t="Διαχωριστική γραμμή">―</B><B c="removeFormat" t="Καθαρισμός μορφοποίησης">✕</B>
      </div>
      <div ref={ref} className="rte-body prose" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Κείμενο άρθρου"
        onInput={() => onChange(ref.current.innerHTML)} onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }} />
      {pick && <MediaPicker onClose={() => setPick(false)} onPick={(u) => { setPick(false); cmd('insertImage', u); }} />}
    </div>
  );
}
const toLocal = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
export const STATUS_OPTS = [{ v: 'draft', l: 'Πρόχειρο' }, { v: 'published', l: 'Δημοσιευμένο' }, { v: 'archived', l: 'Αρχειοθετημένο' }];

/** Γενικό πεδίο φόρμας. Οι τιμές αποθηκεύονται σε μορφή κατάλληλη για το API. */
export function Field({ f, value, onChange, options = [] }) {
  const id = 'f-' + f.k;
  const v = value ?? '';
  const L = <label htmlFor={id}>{f.label}{f.hint && <small>{f.hint}</small>}</label>;
  switch (f.t) {
    case 'area': return <div className="fld">{L}<textarea id={id} rows={f.rows || 4} value={v} onChange={(e) => onChange(e.target.value)} /></div>;
    case 'html': return <div className="fld"><label>{f.label}</label><HtmlEditor value={v} onChange={onChange} /></div>;
    case 'image': return <div className="fld"><label>{f.label}</label><ImageField value={v} onChange={onChange} /></div>;
    case 'pdf': return <div className="fld"><label>{f.label}</label><PdfField value={v} onChange={onChange} /></div>;
    case 'bool': return <div className="fld chk"><label><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.label}{f.hint && <small>{f.hint}</small>}</label></div>;
    case 'select': { const opts = f.opts?.map((o) => (typeof o === 'string' ? { v: o, l: f.labels?.[o] || o } : o)) || options || []; return <div className="fld">{L}<select id={id} value={v} onChange={(e) => onChange(f.num ? (e.target.value === '' ? null : +e.target.value) : e.target.value)}>{f.empty && <option value="">{f.empty}</option>}{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>; }
    case 'date': return <div className="fld">{L}<input id={id} type="date" value={String(v).slice(0, 10)} onChange={(e) => onChange(e.target.value)} /></div>;
    case 'datetime': return <div className="fld">{L}<input id={id} type="datetime-local" value={toLocal(v)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>;
    case 'tags': return <div className="fld">{L}<input id={id} value={Array.isArray(value) ? value.join(', ') : ''} onChange={(e) => onChange(e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} placeholder="π.χ. σχολείο, εκδρομή" /></div>;
    case 'lines': return <div className="fld">{L}<textarea id={id} rows={3} value={Array.isArray(value) ? value.join('\n') : ''} onChange={(e) => onChange(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></div>;
    case 'linkLines': return <div className="fld">{L}<textarea id={id} rows={3} placeholder="Ετικέτα | https://…" value={Array.isArray(value) ? value.map((l) => `${l.label} | ${l.url}`).join('\n') : ''}
      onChange={(e) => onChange(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => { const [a, ...b] = x.split('|'); return b.length ? { label: a.trim(), url: b.join('|').trim() } : { label: '', url: a.trim() }; }))} /></div>;
    case 'num': return <div className="fld">{L}<input id={id} type="number" value={v} onChange={(e) => onChange(e.target.value === '' ? '' : +e.target.value)} /></div>;
    case 'color': return <div className="fld">{L}<div className="row"><input id={id} type="color" value={/^#[0-9a-f]{6}$/i.test(v) ? v : '#ffffff'} onChange={(e) => onChange(e.target.value)} /><input value={v} onChange={(e) => onChange(e.target.value)} aria-label={`${f.label} (κωδικός)`} /></div></div>;
    case 'images': return <ImagesField f={f} value={value} onChange={onChange} />;
    default: return <div className="fld">{L}<input id={id} type="text" value={v} onChange={(e) => onChange(e.target.value)} placeholder={f.ph || ''} /></div>;
  }
}
export function ImagesField({ f, value, onChange }) {
  const list = Array.isArray(value) ? value : []; const [pick, setPick] = useState(false);
  return (
    <div className="fld"><label>{f.label}</label>
      <div className="thumbs">{list.map((u, i) => <div key={i} className="thumb"><img src={u} alt="" /><button type="button" aria-label="Αφαίρεση εικόνας" onClick={() => onChange(list.filter((_, j) => j !== i))}>✕</button></div>)}
        <button type="button" className="thumb add" onClick={() => setPick(true)}>+ Προσθήκη</button></div>
      {pick && <MediaPicker onClose={() => setPick(false)} onPick={(u) => { onChange([...list, u]); setPick(false); }} />}
    </div>
  );
}
