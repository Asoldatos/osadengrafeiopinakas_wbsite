'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast, uploadImage } from '@/lib/clientUpload';
import Icon from '../Icons';

/* =====================================================================================
   Επεξεργαστής εικόνων του πίνακα σύνταξης.
   Περικοπή (ελεύθερη ή με αναλογία), περιστροφή, κατοπτρισμός, ρυθμίσεις χρώματος, φίλτρα,
   αλλαγή μεγέθους και συμπίεση. Όλα γίνονται στον browser· το αποτέλεσμα ανεβαίνει ως νέα εικόνα
   (ή αντικαθιστά την παλιά στη βιβλιοθήκη). Η αρχική εικόνα δεν αλλοιώνεται ποτέ.
   ===================================================================================== */

const RATIOS = [{ k: 'free', l: 'Ελεύθερη', v: null }, { k: 'orig', l: 'Αρχική', v: 'orig' }, { k: '16:9', l: '16:9', v: 16 / 9 }, { k: '4:3', l: '4:3', v: 4 / 3 }, { k: '1:1', l: '1:1', v: 1 }, { k: '3:4', l: '3:4', v: 3 / 4 }, { k: '9:16', l: '9:16', v: 9 / 16 }, { k: '2:1', l: 'Εξώφυλλο 2:1', v: 2 }];
const ADJ = [['bright', 'Φωτεινότητα'], ['contrast', 'Αντίθεση'], ['sat', 'Κορεσμός'], ['warm', 'Θερμοκρασία'], ['shadow', 'Σκιές'], ['vig', 'Βινιέτα']];
const ZERO = { bright: 0, contrast: 0, sat: 0, warm: 0, shadow: 0, vig: 0 };
const FILTERS = [
  ['Κανένα', {}], ['Φωτεινό', { bright: 14, contrast: 6, sat: 6, shadow: 18 }], ['Ζεστό', { warm: 34, sat: 10 }], ['Ψυχρό', { warm: -32, contrast: 6 }],
  ['Ασπρόμαυρο', { sat: -100, contrast: 18 }], ['Παλιά φωτογραφία', { sat: -35, warm: 26, contrast: -12, vig: 40 }], ['Έντονο', { contrast: 24, sat: 36 }],
  ['Απαλό', { bright: 8, contrast: -18, sat: -12, shadow: 20 }], ['Δραματικό', { contrast: 34, sat: -15, vig: 55, bright: -6 }],
];
const SIZES = [['orig', 'Όπως είναι'], [2400, '2400 px'], [1600, '1600 px (προτείνεται)'], [1200, '1200 px'], [800, '800 px']];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Εφαρμογή των ρυθμίσεων στα pixels (ίδιος κώδικας για προεπισκόπηση και τελικό αρχείο, ώστε να βγαίνει ακριβώς ό,τι βλέπεις). */
function applyAdj(ctx, w, h, a) {
  if (!Object.values(a).some(Boolean)) return;
  let img; try { img = ctx.getImageData(0, 0, w, h); } catch { return; } // (π.χ. εικόνα από άλλο domain): απλώς χωρίς ρυθμίσεις, χωρίς να «σπάσει» η σελίδα
  const d = img.data;
  const bf = 1 + a.bright / 200, k = a.contrast >= 0 ? 1 + a.contrast / 90 : 1 + a.contrast / 140, s = 1 + a.sat / 100, wr = a.warm * 0.22, sh = a.shadow / 100, vg = a.vig / 100 * 0.75;
  const cx = w / 2, cy = h / 2, md = cx * cx + cy * cy;
  for (let y = 0; y < h; y++) {
    const dy = (y - cy) * (y - cy);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; let r = d[i], g = d[i + 1], b = d[i + 2];
      r *= bf; g *= bf; b *= bf;
      if (sh) { const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255, lift = sh * (1 - l) * (1 - l) * 70; r += lift; g += lift; b += lift; }
      r = (r - 128) * k + 128; g = (g - 128) * k + 128; b = (b - 128) * k + 128;
      if (s !== 1) { const gr = 0.299 * r + 0.587 * g + 0.114 * b; r = gr + (r - gr) * s; g = gr + (g - gr) * s; b = gr + (b - gr) * s; }
      if (wr) { r += wr; b -= wr; g += wr * 0.15; }
      if (vg) { const f = 1 - vg * (((x - cx) * (x - cx) + dy) / md); r *= f; g *= f; b *= f; }
      d[i] = r < 0 ? 0 : r > 255 ? 255 : r; d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
  }
  ctx.putImageData(img, 0, 0);
}
/** Σχεδίαση της εικόνας με περιστροφή/κατοπτρισμό σε καμβά, με ανώτατη πλευρά maxSide. */
function oriented(img, rot, fh, fv, maxSide) {
  const sw = img.naturalWidth, sh = img.naturalHeight, sc = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.round(sw * sc), h = Math.round(sh * sc), side = rot % 180 !== 0;
  const c = document.createElement('canvas'); c.width = side ? h : w; c.height = side ? w : h;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.translate(c.width / 2, c.height / 2); x.rotate((rot * Math.PI) / 180); x.scale(fh ? -1 : 1, fv ? -1 : 1);
  x.drawImage(img, -w / 2, -h / 2, w, h);
  return c;
}
/** Σμίκρυνση σε βήματα (καλύτερη ποιότητα από ένα απότομο βήμα). */
function downscale(src, sx, sy, sw, sh, tw, th) {
  let c = document.createElement('canvas'), w = sw, h = sh;
  c.width = sw; c.height = sh; c.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
  while (w / 2 > tw) { const n = document.createElement('canvas'); w = Math.round(w / 2); h = Math.round(h / 2); n.width = w; n.height = h; const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, w, h); c = n; }
  const o = document.createElement('canvas'); o.width = tw; o.height = th; const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, tw, th);
  return o;
}
const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
export const editableImage = (url) => !!url && !/\.(svg|gif)(\?|#|$)/i.test(url) && !/^data:/.test(url) && (url.startsWith('/') || /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(url));
const loadUrl = (u) => (u.startsWith('/') ? u : `/api/admin/media-raw?url=${encodeURIComponent(u)}`);

export default function ImageEditor({ src, mediaId, onDone, onClose, title = 'Επεξεργασία εικόνας' }) {
  const [img, setImg] = useState(null), [err, setErr] = useState('');
  const [rot, setRot] = useState(0), [fh, setFh] = useState(false), [fv, setFv] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 1, h: 1 }), [ratio, setRatio] = useState('free');
  const [adj, setAdj] = useState(ZERO), [tab, setTab] = useState('crop'), [compare, setCompare] = useState(false);
  const [size, setSize] = useState(1600), [fmt, setFmt] = useState('image/jpeg'), [qual, setQual] = useState(0.86), [est, setEst] = useState(null);
  const [busy, setBusy] = useState(''), [mode, setMode] = useState('copy');
  const cv = useRef(null), stage = useRef(null), base = useRef(null), raf = useRef(0);
  const [box, setBox] = useState(null); // θέση/μέγεθος του καμβά στην οθόνη (για το πλαίσιο περικοπής)

  useEffect(() => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => setImg(im); im.onerror = () => setErr('Η εικόνα δεν φορτώθηκε για επεξεργασία.');
    im.src = loadUrl(src);
    if (/\.png(\?|#|$)/i.test(src)) setFmt('image/png');
  }, [src]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !busy) onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [busy, onClose]);

  // βάση προεπισκόπησης: προσανατολισμένη, σμικρυμένη
  useEffect(() => { if (img) { base.current = oriented(img, rot, fh, fv, 1400); draw(); } }, [img, rot, fh, fv]); // eslint-disable-line
  const draw = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const b = base.current, c = cv.current; if (!b || !c) return;
      c.width = b.width; c.height = b.height; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(b, 0, 0); if (!compare) applyAdj(x, c.width, c.height, adj);
      measure();
    });
  }, [adj, compare]); // eslint-disable-line
  useEffect(() => { draw(); }, [draw]);
  const measure = () => { const c = cv.current, s = stage.current; if (!c || !s) return; const r = c.getBoundingClientRect(), p = s.getBoundingClientRect(); setBox({ left: r.left - p.left, top: r.top - p.top, w: r.width, h: r.height }); };
  useLayoutEffect(() => { const ro = new ResizeObserver(measure); if (stage.current) ro.observe(stage.current); return () => ro.disconnect(); }, []);

  const dims = useMemo(() => { if (!img) return { W: 1, H: 1 }; const side = rot % 180 !== 0; return { W: side ? img.naturalHeight : img.naturalWidth, H: side ? img.naturalWidth : img.naturalHeight }; }, [img, rot]);
  const aspect = useMemo(() => { const r = RATIOS.find((x) => x.k === ratio)?.v; return r === 'orig' ? dims.W / dims.H : r; }, [ratio, dims]);
  // περικοπή με αναλογία: το μεγαλύτερο δυνατό κεντραρισμένο πλαίσιο
  const fitRatio = (a) => { if (!a) { setCrop({ x: 0, y: 0, w: 1, h: 1 }); return; } let w = 1, h = (dims.W / dims.H) / a; if (h > 1) { h = 1; w = a / (dims.W / dims.H); } setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h }); };
  const pickRatio = (k) => { setRatio(k); const r = RATIOS.find((x) => x.k === k)?.v; fitRatio(r === 'orig' ? dims.W / dims.H : r); };
  const rotate = (d) => { setRot((r) => (r + d + 360) % 360); setCrop({ x: 0, y: 0, w: 1, h: 1 }); setRatio('free'); };

  // σύρσιμο πλαισίου περικοπής
  const drag = useRef(null);
  const down = (e, kind) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); drag.current = { kind, sx: e.clientX, sy: e.clientY, c: { ...crop } }; };
  const move = (e) => {
    const g = drag.current; if (!g || !box) return;
    const dx = (e.clientX - g.sx) / box.w, dy = (e.clientY - g.sy) / box.h, c0 = g.c, MIN = 0.04;
    let { x, y, w, h } = c0;
    if (g.kind === 'move') { x = clamp(c0.x + dx, 0, 1 - c0.w); y = clamp(c0.y + dy, 0, 1 - c0.h); setCrop({ x, y, w, h }); return; }
    const k = g.kind;
    if (k.includes('e')) w = clamp(c0.w + dx, MIN, 1 - c0.x);
    if (k.includes('w')) { const nx = clamp(c0.x + dx, 0, c0.x + c0.w - MIN); w = c0.w + (c0.x - nx); x = nx; }
    if (k.includes('s')) h = clamp(c0.h + dy, MIN, 1 - c0.y);
    if (k.includes('n')) { const ny = clamp(c0.y + dy, 0, c0.y + c0.h - MIN); h = c0.h + (c0.y - ny); y = ny; }
    if (aspect) {
      const R = (dims.W / dims.H) / aspect; // h = w * R (σε κανονικοποιημένες μονάδες)
      if (k === 'n' || k === 's') w = h / R; else h = w * R;
      if (h > 1) { h = 1; w = h / R; } if (w > 1) { w = 1; h = w * R; }
      if (k.includes('n')) y = c0.y + c0.h - h; if (k.includes('w')) x = c0.x + c0.w - w;
      if (k === 'n' || k === 's') x = c0.x + (c0.w - w) / 2; if (k === 'e' || k === 'w') y = c0.y + (c0.h - h) / 2;
      x = clamp(x, 0, 1 - w); y = clamp(y, 0, 1 - h);
    }
    setCrop({ x, y, w, h });
  };
  const up = () => { drag.current = null; };

  const outPx = useMemo(() => { const cw = Math.round(crop.w * dims.W), ch = Math.round(crop.h * dims.H); const tw = size === 'orig' ? cw : Math.min(cw, size); return { w: tw, h: Math.max(1, Math.round(ch * (tw / cw))) }; }, [crop, dims, size]);

  /** Το τελικό αρχείο, σε πλήρη ανάλυση. */
  const render = async () => {
    const full = oriented(img, rot, fh, fv, 6000), sx = Math.round(crop.x * full.width), sy = Math.round(crop.y * full.height), sw = Math.max(1, Math.round(crop.w * full.width)), sh = Math.max(1, Math.round(crop.h * full.height));
    let tw = size === 'orig' ? sw : Math.min(sw, size), th = Math.max(1, Math.round(sh * (tw / sw)));
    let q = fmt === 'image/png' ? undefined : qual, blob;
    for (let tries = 0; tries < 6; tries++) {
      const out = downscale(full, sx, sy, sw, sh, tw, th), x = out.getContext('2d', { willReadFrequently: true });
      if (fmt === 'image/jpeg') { x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#fff'; x.fillRect(0, 0, tw, th); x.globalCompositeOperation = 'source-over'; }
      applyAdj(x, tw, th, adj);
      blob = await toBlob(out, fmt, q);
      if (blob && blob.size <= 3.8 * 1024 * 1024) return blob;
      if (q && q > 0.6) q -= 0.1; else { tw = Math.round(tw * 0.8); th = Math.round(th * 0.8); }
    }
    return blob;
  };
  useEffect(() => { if (tab !== 'export' || !img) return; setEst(null); const t = setTimeout(async () => { const b = await render(); setEst(b?.size || null); }, 350); return () => clearTimeout(t); }, [tab, size, fmt, qual, crop, rot, fh, fv, adj, img]); // eslint-disable-line

  const save = async () => {
    setBusy('Ετοιμάζεται η εικόνα…');
    try {
      const blob = await render(); if (!blob) throw new Error('Δεν δημιουργήθηκε η εικόνα.');
      const ext = fmt === 'image/png' ? 'png' : fmt === 'image/webp' ? 'webp' : 'jpg';
      const name = (decodeURIComponent(src.split('/').pop() || 'eikona').replace(/[?#].*$/, '').replace(/\.[^.]+$/, '').replace(/-[A-Za-z0-9]{20,}$/, '') || 'eikona') + '-edit.' + ext;
      setBusy('Ανεβαίνει…');
      const r = await uploadImage(new File([blob], name, { type: fmt }), { replace: mode === 'replace' && mediaId ? mediaId : undefined });
      toast(mode === 'replace' ? 'Η εικόνα αντικαταστάθηκε!' : 'Η επεξεργασμένη εικόνα αποθηκεύτηκε ως νέο αντίγραφο!', 'celebrate');
      onDone?.(r.url, r);
    } catch (e) { toast(e.message, 'oops'); }
    setBusy('');
  };
  const reset = () => { setRot(0); setFh(false); setFv(false); setAdj(ZERO); setRatio('free'); setCrop({ x: 0, y: 0, w: 1, h: 1 }); };
  const changed = rot || fh || fv || Object.values(adj).some(Boolean) || crop.w < 0.999 || crop.h < 0.999;
  const H = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  return (
    <div className="ie-back" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ie">
        <header className="ie-h">
          <b className="ie-t"><Icon name="sliders" size={18} />{title}</b>
          <span className="grow" />
          <button type="button" className="ie-hb" onClick={reset} disabled={!changed || !!busy}>Επαναφορά</button>
          <button type="button" className="ie-hb" onClick={onClose} disabled={!!busy}>Άκυρο</button>
          <button type="button" className="ie-save" onClick={save} disabled={!img || !!busy}>{busy || 'Αποθήκευση'}</button>
        </header>
        <div className="ie-body">
          <div className={`ie-stage${tab === 'crop' ? ' cropping' : ''}`} ref={stage} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {err ? <p className="ie-err">{err}</p> : !img ? <div className="ie-load" /> : <canvas ref={cv} className="ie-cv" />}
            {img && box && tab === 'crop' && (
              <div className="ie-crop" style={{ left: box.left + crop.x * box.w, top: box.top + crop.y * box.h, width: crop.w * box.w, height: crop.h * box.h }} onPointerDown={(e) => down(e, 'move')}>
                <i className="ie-g1" /><i className="ie-g2" /><i className="ie-g3" /><i className="ie-g4" />
                {H.map((k) => <span key={k} className={`ie-hd ie-${k}`} onPointerDown={(e) => down(e, k)} />)}
                <em className="ie-dim">{Math.round(crop.w * dims.W)} × {Math.round(crop.h * dims.H)}</em>
              </div>)}
            {img && tab !== 'crop' && changed && <button type="button" className="ie-cmp" onPointerDown={() => setCompare(true)} onPointerUp={() => setCompare(false)} onPointerLeave={() => setCompare(false)}>Κράτα πατημένο για το πριν</button>}
          </div>
          <aside className="ie-panel">
            <div className="ie-tabs" role="tablist">{[['crop', 'Περικοπή'], ['adjust', 'Ρυθμίσεις'], ['filters', 'Φίλτρα'], ['export', 'Αποθήκευση']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
            {tab === 'crop' && <div className="ie-sec">
              <h4>Αναλογία</h4>
              <div className="ie-ratios">{RATIOS.map((r) => <button key={r.k} type="button" className={ratio === r.k ? 'on' : ''} onClick={() => pickRatio(r.k)}>{r.l}</button>)}</div>
              <h4>Περιστροφή και καθρέφτης</h4>
              <div className="ie-row">
                <button type="button" className="ie-tool" onClick={() => rotate(-90)} title="Αριστερά 90°"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9a8 8 0 1 1 1.5 9M4 4v5h5" /></svg>Αριστερά</button>
                <button type="button" className="ie-tool" onClick={() => rotate(90)} title="Δεξιά 90°"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9a8 8 0 1 0-1.5 9M20 4v5h-5" /></svg>Δεξιά</button>
                <button type="button" className={`ie-tool${fh ? ' on' : ''}`} onClick={() => setFh(!fh)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M8 7 3 12l5 5zM16 7l5 5-5 5z" /></svg>Οριζόντια</button>
                <button type="button" className={`ie-tool${fv ? ' on' : ''}`} onClick={() => setFv(!fv)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z" /></svg>Κάθετα</button>
              </div>
              <p className="ie-hint">Σύρε το πλαίσιο για να μετακινήσεις την περικοπή και τις γωνίες για να αλλάξεις το μέγεθος.</p>
            </div>}
            {tab === 'adjust' && <div className="ie-sec">
              {ADJ.map(([k, l]) => (
                <label key={k} className="ie-sl"><span>{l}<b>{adj[k] > 0 ? '+' : ''}{adj[k]}</b></span>
                  <input type="range" min={k === 'vig' || k === 'shadow' ? 0 : -100} max="100" value={adj[k]} onChange={(e) => setAdj((a) => ({ ...a, [k]: +e.target.value }))} onDoubleClick={() => setAdj((a) => ({ ...a, [k]: 0 }))} /></label>))}
              <p className="ie-hint">Διπλό κλικ σε μια μπάρα τη μηδενίζει.</p>
            </div>}
            {tab === 'filters' && <div className="ie-sec ie-filters">{FILTERS.map(([l, f]) => { const v = { ...ZERO, ...f }, on = JSON.stringify(v) === JSON.stringify(adj); return <button key={l} type="button" className={on ? 'on' : ''} onClick={() => setAdj(v)}><FilterThumb base={base.current} a={v} /><span>{l}</span></button>; })}</div>}
            {tab === 'export' && <div className="ie-sec">
              <h4>Μέγεθος (πλάτος)</h4>
              <select value={size} onChange={(e) => setSize(e.target.value === 'orig' ? 'orig' : +e.target.value)}>{SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <h4>Μορφή</h4>
              <div className="ie-ratios">{[['image/jpeg', 'JPG'], ['image/webp', 'WEBP (μικρότερο)'], ['image/png', 'PNG (διαφάνεια)']].map(([v, l]) => <button key={v} type="button" className={fmt === v ? 'on' : ''} onClick={() => setFmt(v)}>{l}</button>)}</div>
              {fmt !== 'image/png' && <label className="ie-sl"><span>Ποιότητα<b>{Math.round(qual * 100)}%</b></span><input type="range" min="0.5" max="0.95" step="0.01" value={qual} onChange={(e) => setQual(+e.target.value)} /></label>}
              <dl className="ie-facts"><div><dt>Τελικές διαστάσεις</dt><dd>{outPx.w} × {outPx.h} px</dd></div><div><dt>Μέγεθος αρχείου</dt><dd>{est ? kb(est) : 'υπολογίζεται…'}</dd></div></dl>
              {mediaId && <><h4>Τι να γίνει με την αρχική</h4>
                <label className="ie-radio"><input type="radio" checked={mode === 'copy'} onChange={() => setMode('copy')} /> Κράτα την και φτιάξε νέο αντίγραφο <small>(ασφαλές)</small></label>
                <label className="ie-radio"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Αντικατάστησέ την <small>(αλλάζει παντού όπου χρησιμοποιείται)</small></label></>}
              <p className="ie-hint">Για εξώφυλλα άρθρων προτείνεται 1600 px και JPG ή WEBP: φορτώνει γρήγορα και στο κινητό.</p>
            </div>}
          </aside>
        </div>
      </div>
    </div>
  );
}
function FilterThumb({ base, a }) {
  const r = useRef(null);
  useEffect(() => { const c = r.current; if (!c || !base) return; const s = Math.min(1, 140 / Math.max(base.width, base.height)); c.width = Math.round(base.width * s); c.height = Math.round(base.height * s); const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(base, 0, 0, c.width, c.height); applyAdj(x, c.width, c.height, a); }, [base, a]);
  return <canvas ref={r} />;
}
