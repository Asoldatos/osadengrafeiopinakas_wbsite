'use client';
import { useEffect, useRef, useState } from 'react';
import ResultPanel from './ResultPanel';
import { api } from '@/lib/clientUpload';

const W = 640, H = 400, DUR = 45;
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

export default function Catch() {
  const cv = useRef(null), S = useRef(null), raf = useRef(0);
  const [ui, setUi] = useState({ phase: 'idle', score: 0, left: DUR }), [res, setRes] = useState(null);
  const stop = () => cancelAnimationFrame(raf.current);
  useEffect(() => stop, []);
  const end = async (s) => {
    setUi((u) => ({ ...u, phase: 'over' }));
    try { const r = await api('/api/play/score', { method: 'POST', body: { game: 'catch', meta: { caught: s.caught, bombs: s.bombs } } }); setRes({ xp: r.xp, lines: [`Κιμωλίες: ${s.caught}`, `Σβήστρες που χτύπησες: ${s.bombs}`, `Πόντοι: ${r.score} (ρεκόρ σου: ${r.best})`] }); }
    catch (e) { setRes({ error: e.message }); }
  };
  const draw = (s) => {
    const c = cv.current.getContext('2d'); c.clearRect(0, 0, W, H);
    for (const it of s.items) {
      c.save(); c.translate(it.x, it.y); c.rotate(it.rot);
      if (it.type === 'chalk') { rr(c, -6, -20, 12, 40, 5); c.fillStyle = '#fffdf3'; c.fill(); c.strokeStyle = '#1D2A26'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#1FA0FF'; c.fillRect(-6, 2, 12, 9); }
      else { rr(c, -20, -11, 40, 22, 5); c.fillStyle = '#E5231B'; c.fill(); c.strokeStyle = '#1D2A26'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#2b2f3a'; c.fillRect(-20, 3, 40, 8); }
      c.restore();
    }
    const x = s.x + (s.shake > 0 ? (Math.random() - 0.5) * 8 : 0), y = H - 86;   // Κιμωλάκης
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, H - 8, 30, 6, 0, 0, 7); c.fill();
    c.strokeStyle = '#1D2A26'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 10, y + 68); c.lineTo(x - 11, y + 78); c.moveTo(x + 10, y + 68); c.lineTo(x + 11, y + 78); c.stroke();
    rr(c, x - 24, y, 48, 70, 18); c.fillStyle = '#fffdf3'; c.fill(); c.lineWidth = 4; c.stroke();
    c.fillStyle = '#1FA0FF'; c.fillRect(x - 22, y + 46, 44, 12);
    c.fillStyle = '#1D2A26'; c.beginPath(); c.ellipse(x - 8, y + 24, 3.2, 4.6, 0, 0, 7); c.ellipse(x + 8, y + 24, 3.2, 4.6, 0, 0, 7); c.fill();
    c.beginPath(); if (s.shake > 0) { c.moveTo(x - 7, y + 40); c.quadraticCurveTo(x, y + 33, x + 7, y + 40); } else { c.moveTo(x - 8, y + 34); c.quadraticCurveTo(x, y + 44, x + 8, y + 34); } c.lineWidth = 3; c.stroke();
    c.beginPath(); c.moveTo(x - 24, y + 28); c.quadraticCurveTo(x - 38, y + 10, x - 34, y - 8); c.moveTo(x + 24, y + 28); c.quadraticCurveTo(x + 38, y + 10, x + 34, y - 8); c.stroke();
  };
  const start = () => {
    stop(); setRes(null);
    const s = (S.current = { x: W / 2, items: [], caught: 0, bombs: 0, t: 0, spawn: 0.3, keys: {}, last: 0, shake: 0, hud: 0 });
    setUi({ phase: 'play', score: 0, left: DUR });
    const loop = (ts) => {
      if (!s.last) s.last = ts; const dt = Math.min(0.05, (ts - s.last) / 1000); s.last = ts; s.t += dt; s.shake = Math.max(0, s.shake - dt);
      const dir = (s.keys.ArrowRight || s.keys.d ? 1 : 0) - (s.keys.ArrowLeft || s.keys.a ? 1 : 0); s.x = Math.min(W - 28, Math.max(28, s.x + dir * 340 * dt));
      s.spawn -= dt; if (s.spawn <= 0) { s.spawn = Math.max(0.32, 0.75 - s.t * 0.01); s.items.push({ x: 30 + Math.random() * (W - 60), y: -24, vy: 150 + Math.random() * 80 + s.t * 3.5, type: Math.random() < 0.26 ? 'eraser' : 'chalk', rot: Math.random() * 0.8 - 0.4 }); }
      s.items = s.items.filter((it) => {
        it.y += it.vy * dt;
        if (it.y > H - 96 && it.y < H - 14 && Math.abs(it.x - s.x) < 34) { if (it.type === 'chalk') s.caught++; else { s.bombs++; s.shake = 0.4; } return false; }
        return it.y < H + 30;
      });
      draw(s);
      if (ts - s.hud > 150) { s.hud = ts; setUi({ phase: 'play', score: Math.max(0, s.caught * 3 - s.bombs * 5), left: Math.max(0, Math.ceil(DUR - s.t)) }); }
      if (s.t >= DUR) { draw(s); return end(s); }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  useEffect(() => {
    const dn = (e) => { if (!S.current || ui.phase !== 'play') return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(k)) { S.current.keys[k] = true; e.preventDefault(); } };
    const up = (e) => { if (!S.current) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; S.current.keys[k] = false; };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up); return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [ui.phase]);
  const move = (e) => { if (!S.current || ui.phase !== 'play') return; const r = cv.current.getBoundingClientRect(); S.current.x = Math.min(W - 28, Math.max(28, ((e.clientX - r.left) * W) / r.width)); };
  return (
    <div className="game">
      <div className="game-bar"><span>Πόντοι: <b>{ui.score}</b></span><span>Χρόνος: <b>{ui.left}s</b></span><span className="muted small">Βέλη ← → ή σύρε με το δάχτυλο</span></div>
      <div className="catch-wrap"><canvas ref={cv} width={W} height={H} className="catch" onPointerMove={move} onPointerDown={move} role="img" aria-label="Παιχνίδι: μετακίνησε τον Κιμωλάκη για να πιάσεις τις κιμωλίες και να αποφύγεις τις σβήστρες" />
        {ui.phase === 'idle' && <div className="catch-over"><p className="lede">Πιάσε τις <b>κιμωλίες</b> ✏️ και απόφυγε τις <b>κόκκινες σβήστρες</b>! Έχεις {DUR} δευτερόλεπτα.</p><button type="button" className="btn btn-primary" onClick={start}>Ξεκινάμε!</button></div>}</div>
      {ui.phase === 'over' && (res ? <ResultPanel mood="celebrate" title="Τέλος χρόνου!" lines={res.lines} xp={res.xp} error={res.error}><button type="button" className="btn btn-primary" onClick={start}>Παίξε ξανά</button></ResultPanel> : <p className="muted">Αποθήκευση…</p>)}
    </div>
  );
}
