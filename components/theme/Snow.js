'use client';
import { useEffect, useRef } from 'react';

/** Ρεαλιστικό χιόνι σε canvas: τρία επίπεδα βάθους, ταλάντευση, απαλός άνεμος από τον δείκτη του ποντικιού.
 *  Προσαρμόζεται στη συσκευή (λιγότερες νιφάδες σε κινητά), σταματά όταν η καρτέλα είναι κρυφή και σέβεται τη «μείωση κίνησης». */
export default function Snow({ count = 110, speed = 1, interactive = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext('2d');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, mobile = window.matchMedia?.('(max-width: 700px)').matches;
    let w = 0, h = 0, raf = 0, last = 0, wind = 0, px = -1e4, py = -1e4, flakes = [];
    const spr = document.createElement('canvas'); spr.width = spr.height = 32;
    const sx = spr.getContext('2d'), g = sx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); sx.fillStyle = g; sx.fillRect(0, 0, 32, 32);
    const resize = () => { const d = Math.min(1.5, window.devicePixelRatio || 1); w = innerWidth; h = innerHeight; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const N = Math.round(count * (mobile ? 0.5 : 1) * (reduce ? 0.3 : 1));
    const make = (top) => { const layer = Math.random(), r = 0.8 + layer * layer * 3.4;
      return { x: Math.random() * w, y: top ? -10 - Math.random() * h * 0.2 : Math.random() * h, r, vy: (18 + r * 14) * (0.8 + Math.random() * 0.4), ph: Math.random() * 6.28, fr: 0.6 + Math.random() * 1.2, amp: 8 + r * 6, a: 0.45 + layer * 0.5 }; };
    resize(); flakes = Array.from({ length: N }, () => make(false));
    const onMove = (e) => { const nx = e.clientX, ny = e.clientY; if (px > -1e3) wind += Math.max(-40, Math.min(40, (nx - px) * 0.6)); px = nx; py = ny; };
    const loop = (ts) => {
      const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; wind *= 0.96; const t = ts / 1000, sp = speed * (reduce ? 0.35 : 1);
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.vy * sp * dt; f.x += (reduce ? 0 : Math.sin(t * f.fr + f.ph) * f.amp * dt) + wind * dt * (0.4 + f.r * 0.25);
        if (interactive && !reduce) { const dx = f.x - px, dy = f.y - py, d2 = dx * dx + dy * dy; if (d2 < 9000 && d2 > 1) { const d = Math.sqrt(d2), k = ((95 - d) / 95) * 140 * dt; f.x += (dx / d) * k; f.y += (dy / d) * k * 0.5; } }
        if (f.y > h + 10) Object.assign(f, make(true)); if (f.x > w + 20) f.x = -20; else if (f.x < -20) f.x = w + 20;
        ctx.globalAlpha = f.a; ctx.drawImage(spr, f.x - f.r * 2, f.y - f.r * 2, f.r * 4, f.r * 4);
      }
      ctx.globalAlpha = 1; raf = requestAnimationFrame(loop);
    };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', vis); if (interactive) window.addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis); window.removeEventListener('pointermove', onMove); };
  }, [count, speed, interactive]);
  return <canvas ref={ref} className="snow" aria-hidden="true" />;
}
