'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Sections from '../Sections';
import { Field } from './Fields';
import { SECTION_DEFS, newSection } from '@/lib/sectionDefs.mjs';
import { api, toast } from '@/lib/clientUpload';
import { fmtDate } from '@/lib/util';

const PAGES = [['home', 'Αρχική'], ['about', 'Σχετικά με εμάς'], ['team', 'Η ομάδα μας'], ['contact', 'Επικοινωνία']];
const DEV = { desktop: '100%', tablet: '820px', mobile: '390px' };
const STYLE_FIELDS = [{ k: 'bg', label: 'Χρώμα φόντου', t: 'color' }, { k: 'bgImage', label: 'Εικόνα ή βίντεο φόντου', t: 'image', bg: true }, { k: 'padTop', label: 'Κενό πάνω (px)', t: 'num' }, { k: 'padBottom', label: 'Κενό κάτω (px)', t: 'num' }];

export default function Builder({ site }) {
  const [slug, setSlug] = useState('home'), [secs, setSecs] = useState(null), [pub, setPub] = useState(null), [sel, setSel] = useState(null);
  const [dev, setDev] = useState('desktop'), [data, setData] = useState(null), [save, setSave] = useState('saved'), [revs, setRevs] = useState(null), [add, setAdd] = useState(false);
  const first = useRef(true), timer = useRef(null);
  const load = useCallback(async (s) => {
    setSecs(null); first.current = true;
    try { const r = await api(`/api/admin/pages/${s}`); setSecs(r.draft); setPub(r.published); setSel(null); setSave('saved'); } catch (e) { toast(e.message, 'oops'); }
  }, []);
  useEffect(() => { load(slug); }, [slug, load]);
  useEffect(() => { api('/api/admin/preview-data').then(setData).catch(() => setData({})); }, []);
  // Αυτόματη αποθήκευση πρόχειρου
  useEffect(() => {
    if (!secs) return; if (first.current) { first.current = false; return; }
    setSave('dirty'); clearTimeout(timer.current);
    timer.current = setTimeout(async () => { setSave('saving'); try { await api(`/api/admin/pages/${slug}`, { method: 'PUT', body: { draft: secs } }); setSave('saved'); } catch (e) { setSave('error'); } }, 1200);
    return () => clearTimeout(timer.current);
  }, [secs]);
  const changed = secs && pub && JSON.stringify(secs) !== JSON.stringify(pub);
  useEffect(() => { const f = (e) => { if (save === 'dirty' || save === 'saving') { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', f); return () => window.removeEventListener('beforeunload', f); }, [save]);

  const upd = (id, fn) => setSecs((l) => l.map((s) => (s.id === id ? fn(s) : s)));
  const selected = secs?.find((s) => s.id === sel);
  const move = (id, d) => setSecs((l) => { const i = l.findIndex((s) => s.id === id), j = i + d; if (j < 0 || j >= l.length) return l; const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const dup = (id) => setSecs((l) => { const i = l.findIndex((s) => s.id === id); const c = { ...structuredClone(l[i]), id: newSection('banner').id }; return [...l.slice(0, i + 1), c, ...l.slice(i + 1)]; });
  const remove = (id) => { if (!confirm('Να διαγραφεί αυτή η ενότητα από το πρόχειρο;')) return; setSecs((l) => l.filter((s) => s.id !== id)); setSel(null); };
  const addSec = (t) => { const s = newSection(t); setSecs((l) => [...l, s]); setSel(s.id); setAdd(false); };
  const onText = useCallback((id, path, value) => upd(id, (s) => ({ ...s, props: { ...s.props, [path]: value } })), []);
  const publish = async () => {
    if (!confirm('Η δημοσίευση θα αλλάξει άμεσα την ορατή σελίδα για όλους τους επισκέπτες. Να συνεχίσω;')) return;
    try { await api(`/api/admin/pages/${slug}`, { method: 'PUT', body: { draft: secs } }); await api(`/api/admin/pages/${slug}?action=publish`, { method: 'POST' }); setPub(secs); setSave('saved'); toast('Δημοσιεύτηκε! Ο πίνακας τα έγραψε όλα.', 'celebrate'); } catch (e) { toast(e.message, 'oops'); }
  };
  const discard = async () => {
    if (!confirm('Να απορριφθούν όλες οι αλλαγές και να επανέλθει η δημοσιευμένη εκδοχή;')) return;
    try { const r = await api(`/api/admin/pages/${slug}?action=discard`, { method: 'POST' }); first.current = true; setSecs(r.draft); setSel(null); toast('Οι αλλαγές απορρίφθηκαν.'); } catch (e) { toast(e.message, 'oops'); }
  };
  const openRevs = async () => { try { setRevs(await api(`/api/admin/pages/${slug}?revisions=1`)); } catch (e) { toast(e.message, 'oops'); } };
  const restore = async (id) => {
    if (!confirm('Να επαναφερθεί αυτή η έκδοση στο πρόχειρο;')) return;
    try { const r = await api(`/api/admin/pages/${slug}?action=restore`, { method: 'POST', body: { id } }); first.current = true; setSecs(r.draft); setRevs(null); toast('Η έκδοση επαναφέρθηκε στο πρόχειρο. Δημοσίευσέ την όταν είσαι έτοιμος.'); } catch (e) { toast(e.message, 'oops'); }
  };
  const SAVE = { saved: '✔ Αποθηκεύτηκε', saving: 'Αποθήκευση…', dirty: 'Μη αποθηκευμένες αλλαγές', error: '⚠ Σφάλμα αποθήκευσης' }[save];
  return (
    <div className="bld">
      <div className="bld-top">
        <select value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Σελίδα">{PAGES.map(([s, l]) => <option key={s} value={s}>{l}</option>)}</select>
        <div className="seg" role="group" aria-label="Προεπισκόπηση συσκευής">{[['desktop', '🖥 Υπολογιστής'], ['tablet', '📱 Tablet'], ['mobile', '📲 Κινητό']].map(([d, l]) => <button key={d} type="button" aria-pressed={dev === d} onClick={() => setDev(d)}>{l}</button>)}</div>
        <span className={`savest ${save}`} role="status">{SAVE}</span><span className="grow" />
        <button type="button" className="btn btn-ghost sm" onClick={openRevs}>Ιστορικό</button>
        <button type="button" className="btn btn-ghost sm" onClick={discard} disabled={!changed}>Απόρριψη αλλαγών</button>
        <a className="btn btn-ghost sm" href={slug === 'home' ? '/' : `/${slug}`} target="_blank" rel="noopener noreferrer">Δημόσια σελίδα ↗</a>
        <button type="button" className="btn btn-primary sm" onClick={publish} disabled={!secs}>{changed ? 'Δημοσίευση αλλαγών' : 'Δημοσίευση'}</button>
      </div>
      <div className="bld-body">
        <aside className="bld-left" aria-label="Ενότητες σελίδας">
          <h2>Ενότητες</h2>
          {!secs ? <p className="muted">Φόρτωση…</p> : <ol className="seclist">{secs.map((s, i) => (
            <li key={s.id} className={s.id === sel ? 'on' : ''}>
              <button type="button" className="secname" onClick={() => { setSel(s.id); document.querySelector(`[data-sec="${s.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                <span aria-hidden="true">{SECTION_DEFS[s.type]?.icon}</span>{SECTION_DEFS[s.type]?.label}{s.hidden && <em> (κρυφή)</em>}</button>
              <span className="secacts">
                <button type="button" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="Μετακίνηση πάνω" title="Πάνω">↑</button>
                <button type="button" onClick={() => move(s.id, 1)} disabled={i === secs.length - 1} aria-label="Μετακίνηση κάτω" title="Κάτω">↓</button>
                <button type="button" onClick={() => upd(s.id, (x) => ({ ...x, hidden: !x.hidden }))} aria-label={s.hidden ? 'Εμφάνιση' : 'Απόκρυψη'} title={s.hidden ? 'Εμφάνιση' : 'Απόκρυψη'}>{s.hidden ? '🙈' : '👁'}</button>
                <button type="button" onClick={() => dup(s.id)} aria-label="Διπλασιασμός" title="Διπλασιασμός">⧉</button>
                <button type="button" onClick={() => remove(s.id)} aria-label="Διαγραφή" title="Διαγραφή">🗑</button></span>
            </li>))}</ol>}
          <button type="button" className="btn btn-primary sm block" onClick={() => setAdd(!add)} aria-expanded={add}>+ Προσθήκη ενότητας</button>
          {add && <div className="lib">{Object.entries(SECTION_DEFS).map(([t, d]) => <button key={t} type="button" onClick={() => addSec(t)}><span aria-hidden="true">{d.icon}</span>{d.label}</button>)}</div>}
          <p className="muted small">Πάτα πάνω σε κείμενο στην προεπισκόπηση για να το αλλάξεις απευθείας. Οι κοινές ρυθμίσεις (μενού, υποσέλιδο, χρώματα, λογότυπα) βρίσκονται στις «Ρυθμίσεις ιστοτόπου».</p>
        </aside>
        <section className="bld-stage" aria-label="Προεπισκόπηση">
          <div className="bld-frame" style={{ width: DEV[dev] }}>
            {!secs ? <p className="muted pad">Φόρτωση…</p> : <Sections sections={secs} data={data || {}} site={site} editing selectedId={sel} onSelect={setSel} onText={onText} />}
          </div>
        </section>
        <aside className="bld-right" aria-label="Ιδιότητες">
          {!selected ? <p className="muted">Διάλεξε μια ενότητα για να αλλάξεις τις ιδιότητές της.</p> : (<>
            <h2>{SECTION_DEFS[selected.type].icon} {SECTION_DEFS[selected.type].label}</h2>
            {SECTION_DEFS[selected.type].fields.map((f) => <Field key={f.k} f={f} value={selected.props[f.k]} onChange={(v) => upd(selected.id, (s) => ({ ...s, props: { ...s.props, [f.k]: v } }))} />)}
            <h3>Εμφάνιση ενότητας</h3>
            {STYLE_FIELDS.map((f) => <Field key={f.k} f={f} value={selected.style?.[f.k]} onChange={(v) => upd(selected.id, (s) => ({ ...s, style: { ...s.style, [f.k]: v } }))} />)}
            <button type="button" className="btn btn-ghost sm" onClick={() => upd(selected.id, (s) => ({ ...s, style: { ...s.style, bg: '', bgImage: '' } }))}>Επαναφορά φόντου</button>
          </>)}
        </aside>
      </div>
      {revs && <div className="modal-back" onClick={() => setRevs(null)}><div className="modal wide" role="dialog" aria-modal="true" aria-label="Ιστορικό εκδόσεων" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-x" onClick={() => setRevs(null)} aria-label="Κλείσιμο">✕</button><h3>Ιστορικό δημοσιεύσεων</h3>
        {!revs.length ? <p className="muted">Δεν υπάρχουν ακόμα δημοσιευμένες εκδόσεις.</p> : <ul className="revs">{revs.map((r) => <li key={r.id}><span>{new Date(r.created_at).toLocaleString('el-GR')} — {r.user_name}</span><button type="button" className="btn btn-ghost sm" onClick={() => restore(r.id)}>Επαναφορά</button></li>)}</ul>}
      </div></div>}
    </div>
  );
}
