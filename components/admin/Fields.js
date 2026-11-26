'use client';
import { useEffect, useRef, useState } from 'react';
import TutorialEditor from './TutorialEditor';
import ImageEditor, { editableImage } from './ImageEditor';
import RichEditor from './RichEditor';
import { api, toast, uploadImage, uploadPdf, uploadVideo, isVideoFile } from '@/lib/clientUpload';
import { isVideoUrl, parseVideo, buildVideoUrl, stripHash } from '@/lib/media';

export function MediaPicker({ onPick, onClose, allowVideo = true }) {
  const [rows, setRows] = useState(null), [q, setQ] = useState(''), [prog, setProg] = useState(null), [ed, setEd] = useState(null);
  const ok = (m) => m.mime.startsWith('image/') || (allowVideo && m.mime.startsWith('video/'));
  const load = () => api('/api/admin/media' + (q ? `?q=${encodeURIComponent(q)}` : '')).then((r) => setRows(r.filter(ok))).catch((e) => toast(e.message, 'oops'));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);
  const up = async (f) => {
    if (!f) return;
    try { setProg(0); const url = isVideoFile(f) ? await uploadVideo(f, { onProgress: setProg }) : (await uploadImage(f, { onProgress: setProg })).url; toast(isVideoFile(f) ? 'Το βίντεο ανέβηκε!' : 'Η εικόνα ανέβηκε!'); onPick(url); } catch (e) { toast(e.message, 'oops'); }
    setProg(null);
  };
  return (
    <div className="modal-back" onClick={onClose}><div className="modal wide" role="dialog" aria-modal="true" aria-label="Βιβλιοθήκη πολυμέσων" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="modal-x" onClick={onClose} aria-label="Κλείσιμο">✕</button><h3>{allowVideo ? 'Επιλογή εικόνας ή βίντεο' : 'Επιλογή εικόνας'}</h3>
      <div className="row"><input placeholder="Αναζήτηση…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Αναζήτηση" />
        <label className="btn btn-primary sm">{allowVideo ? 'Νέο αρχείο' : 'Νέα εικόνα'}<input type="file" hidden accept={allowVideo ? 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,video/ogg' : 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'} onChange={(e) => { up(e.target.files[0]); e.target.value = ''; }} /></label></div>
      {prog !== null && <div className="bar"><span style={{ width: `${prog * 100}%` }} /></div>}
      {!rows ? <p>Φόρτωση…</p> : !rows.length ? <p className="muted">Δεν υπάρχουν αρχεία ακόμα. Ανέβασε το πρώτο!</p> : <div className="mgrid">{rows.map((m) => (
        <div key={m.id} className="mitem-w"><button type="button" className="mitem" onClick={() => onPick(m.url)} title={m.name}>
          {m.mime.startsWith('video/') ? <><video src={`${m.url}#t=0.1`} muted preload="metadata" playsInline /><b className="vbadge">Βίντεο</b></> : <img src={m.url} alt={m.alt || m.name} loading="lazy" />}<span>{m.name}</span></button>
          {editableImage(m.url) && <button type="button" className="mitem-ed" onClick={() => setEd(m)} title="Επεξεργασία πριν τη χρήση">Επεξεργασία</button>}</div>))}</div>}
      {ed && <ImageEditor src={ed.url} mediaId={ed.id} onClose={() => setEd(null)} onDone={(u) => { setEd(null); onPick(u); }} />}
    </div></div>
  );
}

function VideoWarning({ onCancel, onOk, background }) {
  return (
    <div className="modal-back" onClick={onCancel}><div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="vw-t" onClick={(e) => e.stopPropagation()}>
      <h3 id="vw-t">⚠️ Επέλεξες βίντεο εκεί που θα έμπαινε εικόνα</h3>
      <p>Μπορείς να το κάνεις, αλλά πρόσεξε:</p>
      <ul className="warnlist">
        <li>Το βίντεο <b>δεν θα φαίνεται</b> σε κοινοποιήσεις (Facebook, WhatsApp…), σε αποτελέσματα αναζήτησης και σε μικρογραφίες.</li>
        <li>Τα βίντεο είναι <b>βαριά</b>: μπορεί να επιβραδύνουν τη σελίδα, ειδικά στο κινητό, και να γεμίσουν τον χώρο αποθήκευσης.</li>
        <li>Προτίμησε αρχεία <b>MP4 (H.264)</b> ή <b>WebM</b>, και αν γίνεται κάτω από 20 MB.</li>
        {background && <li>Ως φόντο ενότητας το βίντεο παίζει πάντα <b>χωρίς ήχο και σε επανάληψη</b>, χωρίς χειριστήρια.</li>}
        <li>Μέσα σε κάρτες και συνδέσμους, ένα βίντεο με χειριστήρια μπορεί να μπερδεύει τους επισκέπτες.</li>
      </ul>
      <div className="row wrap"><button type="button" className="btn btn-primary" onClick={onOk}>Συνέχεια με το βίντεο</button><button type="button" className="btn btn-ghost" onClick={onCancel}>Επιλογή άλλου αρχείου</button></div>
    </div></div>
  );
}

/** Ρυθμίσεις βίντεο: player ή «κινούμενη εικόνα», χειριστήρια, αυτόματη αναπαραγωγή, επανάληψη, ήχος, προσαρμογή, εικόνα προεπισκόπησης. */
export function VideoOptions({ url, background = false, onCancel, onDone }) {
  const [o, setO] = useState(() => parseVideo(url)); const [pp, setPp] = useState(false);
  const set = (p) => setO((x) => ({ ...x, ...p }));
  const v = background ? { ...o, controls: false, autoplay: true, loop: true, muted: true } : { ...o, muted: o.muted || o.autoplay };
  return (
    <div className="modal-back" onClick={onCancel}><div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="vo-t" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="modal-x" onClick={onCancel} aria-label="Κλείσιμο">✕</button>
      <h3 id="vo-t">🎬 Ρυθμίσεις βίντεο</h3>
      <div className="vopt">
        <video key={JSON.stringify(v)} src={stripHash(url)} poster={v.poster || undefined} controls={v.controls} autoPlay={v.autoplay} loop={v.loop} muted={v.muted} playsInline className="vopt-prev" style={{ objectFit: v.fit }} />
        <div>
          {!background && <div className="row wrap presets">
            <button type="button" className="btn btn-ghost sm" onClick={() => set({ controls: true, autoplay: false, loop: false, muted: false })}>🎛 Σαν player (με χειριστήρια)</button>
            <button type="button" className="btn btn-ghost sm" onClick={() => set({ controls: false, autoplay: true, loop: true, muted: true })}>🌀 Σαν κινούμενη εικόνα</button></div>}
          {background ? <p className="muted">Ως φόντο το βίντεο παίζει αυτόματα, χωρίς ήχο και σε επανάληψη. Μπορείς να αλλάξεις μόνο την προσαρμογή και την εικόνα προεπισκόπησης.</p> : (<>
            <label className="chk"><input type="checkbox" checked={o.controls} onChange={(e) => set({ controls: e.target.checked })} /> Εμφάνιση player (χειριστήρια αναπαραγωγής)</label>
            <label className="chk"><input type="checkbox" checked={o.autoplay} onChange={(e) => set({ autoplay: e.target.checked })} /> Αυτόματη αναπαραγωγή <small>(παίζει μόνο χωρίς ήχο)</small></label>
            <label className="chk"><input type="checkbox" checked={o.loop} onChange={(e) => set({ loop: e.target.checked })} /> Επανάληψη (loop)</label>
            <label className="chk"><input type="checkbox" checked={o.muted || o.autoplay} disabled={o.autoplay} onChange={(e) => set({ muted: e.target.checked })} /> Χωρίς ήχο</label></>)}
          <div className="fld"><label htmlFor="vo-fit">Προσαρμογή στο πλαίσιο</label>
            <select id="vo-fit" value={o.fit} onChange={(e) => set({ fit: e.target.value })}><option value="cover">Γέμισμα του χώρου (κόβονται τα άκρα)</option><option value="contain">Ολόκληρο το βίντεο (χωρίς περικοπή)</option></select></div>
          <div className="fld"><label>Εικόνα προεπισκόπησης (poster)<small>Εμφανίζεται πριν ξεκινήσει το βίντεο.</small></label>
            <div className="row wrap">{o.poster && <img src={o.poster} alt="" className="imgf-prev" />}
              <button type="button" className="btn btn-ghost sm" onClick={() => setPp(true)}>{o.poster ? 'Αλλαγή' : 'Επιλογή εικόνας'}</button>
              {o.poster && <button type="button" className="btn btn-ghost sm" onClick={() => set({ poster: '' })}>Αφαίρεση</button>}</div></div>
        </div>
      </div>
      <div className="row wrap"><button type="button" className="btn btn-primary" onClick={() => onDone(buildVideoUrl(url, o))}>Εφαρμογή</button><button type="button" className="btn btn-ghost" onClick={onCancel}>Άκυρο</button></div>
      {pp && <MediaPicker allowVideo={false} onClose={() => setPp(false)} onPick={(u) => { set({ poster: u }); setPp(false); }} />}
    </div></div>
  );
}

/** Επιλογή πολυμέσου: αν επιλεγεί βίντεο, εμφανίζεται πρώτα προειδοποίηση και μετά οι ρυθμίσεις. */
export function PickMedia({ onClose, onPick, allowVideo = true, background = false }) {
  const [p, setP] = useState(null);
  if (p?.stage === 'warn') return <VideoWarning background={background} onCancel={() => setP(null)} onOk={() => setP({ ...p, stage: 'opts' })} />;
  if (p?.stage === 'opts') return <VideoOptions url={p.url} background={background} onCancel={() => setP(null)} onDone={onPick} />;
  return <MediaPicker allowVideo={allowVideo} onClose={onClose} onPick={(u) => (isVideoUrl(u) ? setP({ url: u, stage: 'warn' }) : onPick(u))} />;
}

export function ImageField({ value, onChange, noVideo = false, bg = false }) {
  const [pick, setPick] = useState(false), [opts, setOpts] = useState(false), [ed, setEd] = useState(false);
  const vid = isVideoUrl(value);
  return (
    <div className="imgf">
      {value ? (vid ? <video src={`${stripHash(value)}#t=0.1`} poster={parseVideo(value).poster || undefined} muted preload="metadata" className="imgf-prev" /> : <img src={value} alt="" className="imgf-prev" />) : <div className="imgf-prev empty">Χωρίς εικόνα</div>}
      <div className="col">{vid && <span className="pill published">Βίντεο</span>}
        <button type="button" className="btn btn-ghost sm" onClick={() => setPick(true)}>{value ? 'Αλλαγή' : noVideo ? 'Επιλογή εικόνας' : 'Επιλογή εικόνας / βίντεο'}</button>
        {vid && <button type="button" className="btn btn-ghost sm" onClick={() => setOpts(true)}>Ρυθμίσεις βίντεο</button>}
        {!vid && editableImage(value) && <button type="button" className="btn btn-ghost sm" onClick={() => setEd(true)}>Επεξεργασία / περικοπή</button>}
        {value && <button type="button" className="btn btn-ghost sm" onClick={() => onChange('')}>Αφαίρεση</button>}</div>
      {pick && <PickMedia allowVideo={!noVideo} background={bg} onClose={() => setPick(false)} onPick={(u) => { onChange(u); setPick(false); }} />}
      {opts && <VideoOptions url={value} background={bg} onCancel={() => setOpts(false)} onDone={(u) => { onChange(u); setOpts(false); }} />}
      {ed && <ImageEditor src={value} onClose={() => setEd(false)} onDone={(u) => { onChange(u); setEd(false); }} />}
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
/** Κειμενογράφος (βλ. RichEditor.js). Κρατάμε το παλιό όνομα για συμβατότητα. */
export function HtmlEditor(props) { return <RichEditor {...props} />; }
const toLocal = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
export const STATUS_OPTS = [{ v: 'draft', l: 'Πρόχειρο' }, { v: 'published', l: 'Δημοσιευμένο' }, { v: 'archived', l: 'Αρχειοθετημένο' }];

/** Γενικό πεδίο φόρμας. Οι τιμές αποθηκεύονται σε μορφή κατάλληλη για το API. */
export function Field({ f, value, onChange, options = [], form }) {
  const id = 'f-' + f.k;
  const v = value ?? '';
  const L = <label htmlFor={id}>{f.label}{f.hint && <small>{f.hint}</small>}</label>;
  switch (f.t) {
    case 'bigtitle': return <div className="fld fld-big"><label htmlFor={id} className="sr-only">{f.label}</label><AutoText id={id} className={f.sub ? 'studio-sub' : 'studio-title'} value={v} onChange={onChange} placeholder={f.ph || f.label} max={f.max} /></div>;
    case 'area': return <div className="fld">{L}<textarea id={id} rows={f.rows || 4} value={v} onChange={(e) => onChange(e.target.value)} /></div>;
    case 'html': return <div className="fld fld-html"><label>{f.label}{f.hint && <small>{f.hint}</small>}</label><HtmlEditor value={v} onChange={onChange} draftKey={f.draftKey ? f.draftKey(form || {}) : undefined} /></div>;
    case 'image': return <div className="fld"><label>{f.label}</label><ImageField value={v} onChange={onChange} noVideo={f.noVideo} bg={f.bg} /></div>;
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
    case 'scenes': return <SceneEditor f={f} value={value} onChange={onChange} />;
    case 'emoji': return (<div className="fld">{L}<div className="emo-pick" role="radiogroup" aria-label={f.label}>
      {(f.opts || []).map((e) => <button key={e} type="button" role="radio" aria-checked={v === e} className={`emo${v === e ? ' on' : ''}`} onClick={() => onChange(e)}>{e}</button>)}
      <input id={id} className="emo-own" value={v} maxLength={8} onChange={(e) => onChange(e.target.value)} aria-label="Ή γράψε δικό σου emoji" placeholder="άλλο" /></div></div>);
    case 'tutorial': return <TutorialEditor f={f} value={value} onChange={onChange} form={form} />;
    default: return <div className="fld">{L}<input id={id} type="text" value={v} onChange={(e) => onChange(e.target.value)} placeholder={f.ph || ''} /></div>;
  }
}
/** Πεδίο κειμένου που μεγαλώνει μόνο του (για μεγάλους τίτλους στο studio άρθρων). */
function AutoText({ id, className, value, onChange, placeholder, max }) {
  const r = useRef(null);
  useEffect(() => { const t = r.current; if (t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; } }, [value]);
  return <><textarea ref={r} id={id} rows={1} className={className} value={value} placeholder={placeholder} maxLength={max || 300} onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} />{max && <small className="fld-count">{String(value || '').length}/{max}</small>}</>;
}
export function ImagesField({ f, value, onChange }) {
  const list = Array.isArray(value) ? value : []; const [pick, setPick] = useState(false);
  return (
    <div className="fld"><label>{f.label}</label>
      <div className="thumbs">{list.map((u, i) => <div key={i} className="thumb">{isVideoUrl(u) ? <><video src={`${stripHash(u)}#t=0.1`} muted preload="metadata" /><b className="vbadge">🎬</b></> : <img src={u} alt="" />}<button type="button" aria-label="Αφαίρεση" onClick={() => onChange(list.filter((_, j) => j !== i))}>✕</button></div>)}
        <button type="button" className="thumb add" onClick={() => setPick(true)}>+ Προσθήκη</button></div>
      {pick && <PickMedia onClose={() => setPick(false)} onPick={(u) => { onChange([...list, u]); setPick(false); }} />}
    </div>
  );
}

const MOOD_LABELS = { happy: 'Χαρούμενος', wave: 'Χαιρετά', celebrate: 'Πανηγυρίζει', reading: 'Διαβάζει', confused: 'Μπερδεμένος', phone: 'Με κινητό', work: 'Δουλεύει', oops: 'Ωχ!' };
/** Οπτικός επεξεργαστής περιπέτειας: σκηνές, διάθεση του Κιμωλάκη, επιλογές που οδηγούν σε άλλες σκηνές, τέλη. */
export function SceneEditor({ f, value, onChange }) {
  const sc = Array.isArray(value) ? value : [];
  const upd = (i, p) => onChange(sc.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const nextId = () => { let n = sc.length + 1; while (sc.some((s) => s.id === `s${n}`)) n++; return `s${n}`; };
  const add = () => onChange([...sc, { id: nextId(), title: '', text: '', mood: 'happy', end: false, endingTitle: '', choices: [] }]);
  const remove = (i) => { if (!confirm('Να διαγραφεί αυτή η σκηνή; Οι επιλογές που οδηγούσαν σε αυτήν θα πρέπει να αλλάξουν.')) return; const id = sc[i].id; onChange(sc.filter((_, j) => j !== i).map((s) => ({ ...s, choices: s.choices.filter((c) => c.to !== id) }))); };
  const opts = sc.map((s, i) => ({ v: s.id, l: `${i + 1}. ${s.title || s.id}` }));
  return (
    <div className="fld scenes"><label>{f.label}<small>Η πρώτη σκηνή είναι η αρχή της ιστορίας. Κάθε σκηνή είτε έχει επιλογές είτε είναι τέλος.</small></label>
      {sc.map((s, i) => (
        <div key={s.id} className={`scene${s.end ? ' end' : ''}`}>
          <div className="scene-h"><b>{i + 1}. {i === 0 ? '▶ Αρχή' : s.end ? '🏁 Τέλος' : 'Σκηνή'}</b><span className="grow" />
            {i > 0 && <button type="button" className="icon-btn sm" aria-label="Μετακίνηση πάνω" onClick={() => { const a = [...sc]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(a); }}>↑</button>}
            <button type="button" className="icon-btn sm" aria-label="Διαγραφή σκηνής" disabled={sc.length < 2} onClick={() => remove(i)}>🗑</button></div>
          <div className="row wrap"><input aria-label="Τίτλος σκηνής" placeholder="Τίτλος σκηνής" value={s.title} onChange={(e) => upd(i, { title: e.target.value })} />
            <select aria-label="Διάθεση Κιμωλάκη" value={s.mood} onChange={(e) => upd(i, { mood: e.target.value })}>{Object.entries(MOOD_LABELS).map(([v, l]) => <option key={v} value={v}>Κιμωλάκης: {l}</option>)}</select></div>
          <textarea aria-label="Κείμενο σκηνής" rows={4} placeholder="Τι συμβαίνει σε αυτή τη σκηνή; (κενή γραμμή = νέα παράγραφος)" value={s.text} onChange={(e) => upd(i, { text: e.target.value })} />
          <label className="chk"><input type="checkbox" checked={s.end} onChange={(e) => upd(i, { end: e.target.checked })} /> Αυτή η σκηνή είναι τέλος της ιστορίας</label>
          {s.end ? <input aria-label="Τίτλος τέλους" placeholder="Τίτλος του τέλους (π.χ. Η μεγάλη έκπληξη)" value={s.endingTitle} onChange={(e) => upd(i, { endingTitle: e.target.value })} /> : (
            <div className="choices">{s.choices.map((c, k) => (
              <div key={k} className="row"><input aria-label="Κείμενο επιλογής" placeholder="Κείμενο επιλογής" value={c.label} onChange={(e) => upd(i, { choices: s.choices.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })} />
                <select aria-label="Οδηγεί στη σκηνή" value={c.to} onChange={(e) => upd(i, { choices: s.choices.map((x, j) => (j === k ? { ...x, to: e.target.value } : x)) })}><option value="">— οδηγεί σε… —</option>{opts.filter((o) => o.v !== s.id).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                <button type="button" className="icon-btn sm" aria-label="Αφαίρεση επιλογής" onClick={() => upd(i, { choices: s.choices.filter((_, j) => j !== k) })}>✕</button></div>))}
              {s.choices.length < 5 && <button type="button" className="btn btn-ghost sm" onClick={() => upd(i, { choices: [...s.choices, { label: '', to: '' }] })}>+ Επιλογή</button>}</div>)}
        </div>))}
      <button type="button" className="btn btn-ghost sm" onClick={add}>+ Νέα σκηνή</button>
    </div>
  );
}
