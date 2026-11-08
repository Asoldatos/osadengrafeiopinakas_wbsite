'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import HotspotModal, { hotspotIcon } from './HotspotModal';
import { MascotSay } from './Mascot';
import PrintButton from './play/PrintButton';

function Thumb({ pdf, i, active, onGo }) {
  const ref = useRef(null); const [seen, setSeen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: '300px' });
    io.observe(ref.current); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!seen || !pdf) return; let off = false;
    pdf.getPage(i + 1).then((p) => {
      if (off) return; const v0 = p.getViewport({ scale: 1 }); const v = p.getViewport({ scale: 110 / v0.width });
      const cv = ref.current?.querySelector('canvas'); if (!cv) return; cv.width = v.width; cv.height = v.height;
      p.render({ canvasContext: cv.getContext('2d'), viewport: v });
    }).catch(() => {});
    return () => { off = true; };
  }, [seen, pdf, i]);
  return <button ref={ref} type="button" className={`th${active ? ' on' : ''}`} onClick={() => onGo(i)} aria-label={`Μετάβαση στη σελίδα ${i + 1}`} aria-current={active ? 'true' : undefined}><canvas /><span>{i + 1}</span></button>;
}

export default function Viewer({ edition, hotspots = [], printUrl, printLocked, dlOk = false }) {
  const root = useRef(null), host = useRef(null), flipRef = useRef(null), els = useRef([]), done = useRef(new Set()), pdfRef = useRef(null);
  const [status, setStatus] = useState('loading'); const [pdfDoc, setPdfDoc] = useState(null);
  const [page, setPage] = useState(0), [total, setTotal] = useState(0), [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false), [thumbs, setThumbs] = useState(false), [open, setOpen] = useState(null), [attempt, setAttempt] = useState(0);

  const renderPage = useCallback((i) => {
    const pdf = pdfRef.current;
    if (!pdf || i < 0 || i >= els.current.length || done.current.has(i)) return;
    done.current.add(i);
    pdf.getPage(i + 1).then((p) => {
      const cv = els.current[i]?.querySelector('canvas'); if (!cv) return;
      const v0 = p.getViewport({ scale: 1 });
      const scale = Math.min(3, Math.max(0.8, (900 * Math.min(window.devicePixelRatio || 1, 2)) / v0.width));
      const v = p.getViewport({ scale }); cv.width = v.width; cv.height = v.height;
      p.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise.then(() => cv.classList.add('ready'));
    }).catch(() => done.current.delete(i));
  }, []);
  const ensure = useCallback((idx) => { for (let k = idx - 2; k <= idx + 3; k++) renderPage(k); }, [renderPage]);

  useEffect(() => {
    let dead = false, flip, pdf;
    done.current = new Set(); setStatus('loading');
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist/build/pdf');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        pdf = await pdfjs.getDocument({ url: `/api/pdf/digital/${edition.slug}`, rangeChunkSize: 1 << 18 }).promise;
        if (dead) { pdf.destroy(); return; }
        pdfRef.current = pdf; setPdfDoc(pdf); setTotal(pdf.numPages);
        const first = await pdf.getPage(1); const v = first.getViewport({ scale: 1 }); const ratio = v.width / v.height;
        const { PageFlip } = await import('page-flip');
        const el = host.current; el.innerHTML = '';
        const pages = [];
        for (let i = 0; i < pdf.numPages; i++) {
          const pg = document.createElement('div'); pg.className = 'pf-page';
          pg.dataset.density = i === 0 || i === pdf.numPages - 1 ? 'hard' : 'soft';
          const inner = document.createElement('div'); inner.className = 'pf-inner';
          const cv = document.createElement('canvas'); cv.className = 'pf-canvas'; inner.appendChild(cv);
          hotspots.filter((h) => h.page_no === i + 1).forEach((h) => {
            const b = document.createElement('button'); b.type = 'button'; b.className = `hs hs-${h.type}`;
            b.style.cssText = `left:${h.x * 100}%;top:${h.y * 100}%;width:${h.w * 100}%;height:${h.h * 100}%`;
            b.setAttribute('aria-label', h.label || 'Διαδραστικό στοιχείο');
            const sp = document.createElement('span'); sp.textContent = hotspotIcon(h); b.appendChild(sp);
            ['mousedown', 'touchstart', 'pointerdown'].forEach((ev) => b.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
            b.addEventListener('click', (e) => { e.stopPropagation(); setOpen(h); });
            inner.appendChild(b);
          });
          pg.appendChild(inner); pages.push(pg);
        }
        els.current = pages;
        flip = new PageFlip(el, { width: 500, height: Math.round(500 / ratio), size: 'stretch', minWidth: 240, maxWidth: 1000, minHeight: 320, maxHeight: 1600,
          showCover: true, drawShadow: true, maxShadowOpacity: 0.45, flippingTime: 750, usePortrait: true, autoSize: true, mobileScrollSupport: true, swipeDistance: 25, clickEventForward: true, useMouseEvents: true, showPageCorners: true });
        flip.loadFromHTML(pages); flipRef.current = flip;
        flip.on('flip', (e) => { setPage(e.data); ensure(e.data); });
        ensure(0); setStatus('ready');
      } catch (e) { console.error(e); if (!dead) setStatus('error'); }
    })();
    return () => { dead = true; try { flip?.destroy(); } catch {} try { pdf?.destroy(); } catch {} pdfRef.current = null; };
  }, [edition.slug, hotspots, attempt, ensure]);

  useEffect(() => { const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 60); return () => clearTimeout(t); }, [zoom, full, thumbs]);
  useEffect(() => {
    const f = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const prev = () => flipRef.current?.flipPrev('top'), next = () => flipRef.current?.flipNext('top');
  const go = (i) => { flipRef.current?.flip(i); setPage(i); ensure(i); };
  const toggleFull = async () => {
    const r = root.current;
    if (!full) { setFull(true); try { await r.requestFullscreen?.(); } catch {} }
    else { setFull(false); if (document.fullscreenElement) try { await document.exitFullscreen(); } catch {} }
  };
  const onKey = (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); } else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(total - 1);
    else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
    else if (e.key === '-') setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)));
    else if (e.key.toLowerCase() === 'f') toggleFull();
    else if (e.key === 'Escape' && full && !document.fullscreenElement) setFull(false);
  };
  return (
    <div ref={root} className={`viewer${full ? ' vw-full' : ''}`} tabIndex={0} onKeyDown={onKey} onContextMenu={(e) => e.preventDefault()} role="region" aria-label={`Αναγνώστης τεύχους: ${edition.title}`}>
      <div className="vw-bar">
        <button type="button" className="icon-btn" onClick={() => setThumbs(!thumbs)} aria-pressed={thumbs} title="Μικρογραφίες σελίδων" aria-label="Μικρογραφίες σελίδων">▦</button>
        <div className="vw-nav">
          <button type="button" className="icon-btn" onClick={prev} disabled={status !== 'ready'} aria-label="Προηγούμενη σελίδα">←</button>
          <span className="vw-count" aria-live="polite">{status === 'ready' ? `Σελίδα ${page + 1} από ${total}` : '…'}</span>
          <button type="button" className="icon-btn" onClick={next} disabled={status !== 'ready'} aria-label="Επόμενη σελίδα">→</button>
        </div>
        <div className="vw-tools">
          <button type="button" className="icon-btn" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} disabled={zoom <= 1} aria-label="Σμίκρυνση">−</button>
          <span className="vw-zoom" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" className="icon-btn" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} disabled={zoom >= 3} aria-label="Μεγέθυνση">+</button>
          <button type="button" className="icon-btn" onClick={toggleFull} aria-pressed={full} aria-label={full ? 'Έξοδος από πλήρη οθόνη' : 'Πλήρης οθόνη'} title="Πλήρης οθόνη (F)">⛶</button>
          {printLocked && <a className="icon-btn" href={printLocked} aria-label="Συνδέσου για λήψη εκτυπώσιμου PDF" title="Συνδέσου για να κατεβάσεις ή να εκτυπώσεις">🔒⬇</a>}
          {printUrl && <PrintButton slug={edition.slug} ready={dlOk} icon />}
        </div>
      </div>
      <div className="vw-body">
        {thumbs && status === 'ready' && <div className="vw-thumbs" role="list" aria-label="Σελίδες">{Array.from({ length: total }, (_, i) => <Thumb key={i} pdf={pdfDoc} i={i} active={i === page} onGo={go} />)}</div>}
        <div className="vw-stage" style={{ overflow: zoom > 1 ? 'auto' : 'hidden' }}>
          <div className="vw-zoomer" style={{ width: `${zoom * 100}%` }}><div ref={host} className="vw-book" /></div>
          {status === 'loading' && <div className="vw-over"><MascotSay mood="reading" k="loading" /></div>}
          {status === 'error' && <div className="vw-over"><MascotSay mood="oops" text="Δεν μπορέσαμε να ανοίξουμε το τεύχος αυτή τη στιγμή.">
            <button type="button" className="btn btn-primary" onClick={() => setAttempt((a) => a + 1)}>Δοκίμασε ξανά</button></MascotSay></div>}
        </div>
      </div>
      {status === 'ready' && total > 1 && <div className="vw-foot"><label className="sr-only" htmlFor="vw-range">Μετάβαση σε σελίδα</label>
        <input id="vw-range" type="range" min={1} max={total} value={page + 1} onChange={(e) => go(+e.target.value - 1)} /></div>}
      <p className="vw-hint">Χρησιμοποίησε τα βέλη ← → για αλλαγή σελίδας, τα + − για ζουμ και το F για πλήρη οθόνη.</p>
      {open && <HotspotModal h={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
