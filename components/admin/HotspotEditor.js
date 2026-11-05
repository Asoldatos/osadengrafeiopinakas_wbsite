'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, toast } from '@/lib/clientUpload';
import { Field, ImagesField } from './Fields';
import HotspotModal, { HOTSPOT_TYPES, hotspotIcon } from '../HotspotModal';
import { MascotSay } from '../Mascot';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export default function HotspotEditor({ edition }) {
  const [pdf, setPdf] = useState(null), [total, setTotal] = useState(0), [pageNo, setPageNo] = useState(1), [err, setErr] = useState(false);
  const [hs, setHs] = useState([]), [sel, setSel] = useState(null), [articles, setArticles] = useState([]), [prev, setPrev] = useState(null), [busy, setBusy] = useState(false);
  const cv = useRef(null), ov = useRef(null), drag = useRef(null);

  useEffect(() => {
    let dead = false;
    api(`/api/admin/hotspots?edition_id=${edition.id}`).then((r) => !dead && setHs(r)).catch((e) => toast(e.message, 'oops'));
    api('/api/admin/articles').then((r) => !dead && setArticles(r.map((a) => ({ v: a.slug, l: a.title })))).catch(() => {});
    (async () => {
      try {
        const lib = await import('pdfjs-dist/build/pdf'); lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        const d = await lib.getDocument({ url: `/api/pdf/digital/${edition.slug}` }).promise;
        if (!dead) { setPdf(d); setTotal(d.numPages); }
      } catch { if (!dead) setErr(true); }
    })();
    return () => { dead = true; };
  }, [edition.id, edition.slug]);
  useEffect(() => {
    if (!pdf) return; let off = false;
    pdf.getPage(pageNo).then((p) => {
      if (off) return; const v0 = p.getViewport({ scale: 1 }); const v = p.getViewport({ scale: (760 * Math.min(2, window.devicePixelRatio || 1)) / v0.width });
      const c = cv.current; c.width = v.width; c.height = v.height; c.style.aspectRatio = `${v.width}/${v.height}`;
      p.render({ canvasContext: c.getContext('2d'), viewport: v });
    });
    return () => { off = true; };
  }, [pdf, pageNo]);

  const mine = hs.filter((h) => h.page_no === pageNo);
  const cur = hs.find((h) => h.id === sel);
  const patch = (id, p) => setHs((l) => l.map((h) => (h.id === id ? { ...h, ...p } : h)));
  const persist = useCallback(async (h, quiet) => {
    try { const r = await api(`/api/admin/hotspots/${h.id}`, { method: 'PUT', body: h }); patch(h.id, r); if (!quiet) toast('Αποθηκεύτηκε!'); } catch (e) { toast(e.message, 'oops'); }
  }, []);
  const create = async () => {
    setBusy(true);
    try { const r = await api('/api/admin/hotspots', { method: 'POST', body: { edition_id: edition.id, page_no: pageNo, x: 0.35, y: 0.4, w: 0.3, h: 0.12, type: 'link', label: '', config: {} } }); setHs((l) => [...l, r]); setSel(r.id); toast('Το στοιχείο προστέθηκε. Σύρε το στη θέση του!'); } catch (e) { toast(e.message, 'oops'); }
    setBusy(false);
  };
  const remove = async () => {
    if (!confirm('Να διαγραφεί αυτό το διαδραστικό στοιχείο;')) return;
    try { await api(`/api/admin/hotspots/${cur.id}`, { method: 'DELETE' }); setHs((l) => l.filter((h) => h.id !== cur.id)); setSel(null); toast('Διαγράφηκε.', 'oops'); } catch (e) { toast(e.message, 'oops'); }
  };
  /* Σύρσιμο και αλλαγή μεγέθους με κανονικοποιημένες συντεταγμένες (0–1) */
  const down = (e, h, mode) => {
    e.preventDefault(); e.stopPropagation(); setSel(h.id);
    const r = ov.current.getBoundingClientRect();
    drag.current = { id: h.id, mode, sx: e.clientX, sy: e.clientY, o: { x: h.x, y: h.y, w: h.w, h: h.h }, r, moved: false };
    const mv = (ev) => {
      const d = drag.current; if (!d) return; d.moved = true;
      const dx = (ev.clientX - d.sx) / d.r.width, dy = (ev.clientY - d.sy) / d.r.height;
      if (d.mode === 'move') patch(d.id, { x: clamp(d.o.x + dx, 0, 1 - d.o.w), y: clamp(d.o.y + dy, 0, 1 - d.o.h) });
      else patch(d.id, { w: clamp(d.o.w + dx, 0.04, 1 - d.o.x), h: clamp(d.o.h + dy, 0.03, 1 - d.o.y) });
    };
    const up = () => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      const d = drag.current; drag.current = null;
      if (d?.moved) setHs((l) => { const x = l.find((q) => q.id === d.id); if (x) persist(x, true); return l; });
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  const key = (e, h) => {
    const s = e.shiftKey ? 0.02 : 0.005; let p = null;
    if (e.key === 'ArrowLeft') p = { x: clamp(h.x - s, 0, 1 - h.w) }; if (e.key === 'ArrowRight') p = { x: clamp(h.x + s, 0, 1 - h.w) };
    if (e.key === 'ArrowUp') p = { y: clamp(h.y - s, 0, 1 - h.h) }; if (e.key === 'ArrowDown') p = { y: clamp(h.y + s, 0, 1 - h.h) };
    if (p) { e.preventDefault(); patch(h.id, p); }
  };
  const setCfg = (k, v) => patch(cur.id, { config: { ...cur.config, [k]: v } });
  if (err) return <MascotSay mood="oops" text="Δεν ήταν δυνατό να φορτωθεί το PDF. Βεβαιώσου ότι το τεύχος έχει ανεβασμένο ψηφιακό PDF." />;
  const c = cur?.config || {};
  return (
    <div className="he">
      <div className="he-main">
        <div className="he-bar">
          <button type="button" className="icon-btn" disabled={pageNo <= 1} onClick={() => setPageNo(pageNo - 1)} aria-label="Προηγούμενη σελίδα">←</button>
          <label>Σελίδα <input type="number" min={1} max={total || 1} value={pageNo} onChange={(e) => setPageNo(clamp(+e.target.value || 1, 1, total || 1))} /> από {total || '…'}</label>
          <button type="button" className="icon-btn" disabled={pageNo >= total} onClick={() => setPageNo(pageNo + 1)} aria-label="Επόμενη σελίδα">→</button>
          <span className="grow" /><button type="button" className="btn btn-primary sm" onClick={create} disabled={busy || !pdf}>+ Νέο διαδραστικό στοιχείο</button>
        </div>
        <div className="he-stage">
          {!pdf && <p className="muted pad">Φόρτωση σελίδας…</p>}
          <div ref={ov} className="he-page" style={{ display: pdf ? 'block' : 'none' }} onPointerDown={() => setSel(null)}>
            <canvas ref={cv} />
            {mine.map((h) => (
              <div key={h.id} className={`he-hs${h.id === sel ? ' on' : ''}`} tabIndex={0} role="button" aria-label={`${HOTSPOT_TYPES[h.type]?.label}: ${h.label || 'χωρίς τίτλο'}`}
                style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: `${h.w * 100}%`, height: `${h.h * 100}%` }}
                onPointerDown={(e) => down(e, h, 'move')} onKeyDown={(e) => key(e, h)} onFocus={() => setSel(h.id)}>
                <span>{hotspotIcon(h)}</span>{h.id === sel && <i className="he-grip" onPointerDown={(e) => down(e, h, 'resize')} aria-label="Αλλαγή μεγέθους" />}
              </div>))}
          </div>
        </div>
        <p className="muted small">Σύρε ένα στοιχείο για να το μετακινήσεις, τράβα τη γωνία του για να αλλάξεις μέγεθος (ή χρησιμοποίησε τα βελάκια του πληκτρολογίου). Οι θέσεις αποθηκεύονται ως ποσοστά της σελίδας και ταιριάζουν σε κάθε οθόνη.</p>
      </div>
      <aside className="he-side">
        <h2>Ιδιότητες</h2>
        {!cur ? <p className="muted">{mine.length ? 'Διάλεξε ένα στοιχείο της σελίδας.' : 'Δεν υπάρχουν στοιχεία σε αυτή τη σελίδα. Πάτα «Νέο διαδραστικό στοιχείο».'}</p> : (<>
          <Field f={{ k: 'type', label: 'Τύπος', t: 'select', opts: Object.entries(HOTSPOT_TYPES).map(([v, o]) => ({ v, l: `${o.icon} ${o.label}` })) }} value={cur.type} onChange={(v) => patch(cur.id, { type: v, config: {} })} />
          <Field f={{ k: 'label', label: 'Τίτλος / περιγραφή (για αναγνώστες οθόνης)', t: 'text' }} value={cur.label} onChange={(v) => patch(cur.id, { label: v })} />
          <Field f={{ k: 'icon', label: 'Εικονίδιο (emoji, προαιρετικό)', t: 'text', ph: HOTSPOT_TYPES[cur.type]?.icon }} value={cur.icon} onChange={(v) => patch(cur.id, { icon: v.slice(0, 4) })} />
          {cur.type === 'link' && <Field f={{ k: 'url', label: 'Διεύθυνση (https://…)', t: 'url' }} value={c.url} onChange={(v) => setCfg('url', v)} />}
          {cur.type === 'article' && <Field f={{ k: 'slug', label: 'Άρθρο', t: 'select', empty: '— Επίλεξε άρθρο —' }} options={articles} value={c.slug} onChange={(v) => setCfg('slug', v)} />}
          {['video', 'audio', 'game'].includes(cur.type) && <Field f={{ k: 'url', label: cur.type === 'video' ? 'Σύνδεσμος YouTube / Vimeo / .mp4' : cur.type === 'audio' ? 'Σύνδεσμος αρχείου ήχου (.mp3)' : 'Σύνδεσμος παιχνιδιού (https://…)', t: 'url' }} value={c.url} onChange={(v) => setCfg('url', v)} />}
          {cur.type === 'gallery' && <ImagesField f={{ label: 'Εικόνες' }} value={c.images} onChange={(v) => setCfg('images', v)} />}
          {cur.type === 'text' && <Field f={{ k: 'text', label: 'Κείμενο', t: 'area', rows: 6 }} value={c.text} onChange={(v) => setCfg('text', v)} />}
          {cur.type === 'custom' && <Field f={{ k: 'html', label: 'Περιεχόμενο HTML (καθαρίζεται αυτόματα)', t: 'area', rows: 6 }} value={c.html} onChange={(v) => setCfg('html', v)} />}
          <div className="row wrap"><button type="button" className="btn btn-primary sm" onClick={() => persist(cur)}>Αποθήκευση</button>
            <button type="button" className="btn btn-ghost sm" onClick={() => setPrev(cur)}>Προεπισκόπηση</button>
            <button type="button" className="btn btn-danger sm" onClick={remove}>Διαγραφή</button></div>
        </>)}
        <h3>Όλα τα στοιχεία ({hs.length})</h3>
        <ul className="hslist">{hs.map((h) => <li key={h.id}><button type="button" onClick={() => { setPageNo(h.page_no); setSel(h.id); }}>σελ. {h.page_no} · {hotspotIcon(h)} {h.label || HOTSPOT_TYPES[h.type]?.label}</button></li>)}</ul>
      </aside>
      {prev && <HotspotModal h={prev} onClose={() => setPrev(null)} />}
    </div>
  );
}
