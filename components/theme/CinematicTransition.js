'use client';
import { useEffect, useRef, useState } from 'react';
import Mascot from '../Mascot';
import { audio } from '../audio/engine';
import { buildTimeline, progressIn, layerLevel, shakeAt, particleBudget, easeOutBack, easeInOutCubic, easeOutCubic, clamp01 } from '@/lib/timeline.mjs';
import { sprite, SETS, CONFETTI } from './sprites';

const TAU = Math.PI * 2;
/** Κινηματογραφική μετάβαση εποχιακού θέματος σε 4 φάσεις (αρχή → κατάληψη με «υγρό» → μεταμόρφωση → αποκάλυψη).
 *  Γενική: χρώματα, διάρκειες, σωματίδια, λογότυπο, στολή και ήχοι έρχονται από τις ρυθμίσεις του θέματος.
 *  Όταν ο ήχος είναι διαθέσιμος, το ρολόι της κίνησης είναι το ρολόι του AudioContext → εικόνα και ήχος μένουν απόλυτα συγχρονισμένα.
 *  mode: 'in' (ενεργοποίηση, με μεταμόρφωση του Κιμωλάκη) ή 'out' (σύντομη επιστροφή στην κανονική εμφάνιση). */
export default function CinematicTransition({ theme, mode = 'in', reduced = false, logoUrl, baseColors, onCovered, onDone, sound = true }) {
  const cfg = theme.config, tr = cfg.transition, tx = cfg.texts;
  const cvRef = useRef(null), camRef = useRef(null), logoRef = useRef(null), stageRef = useRef(null), mascotRef = useRef(null), ringRef = useRef(null), speechRef = useRef(null), titleRef = useRef(null), flashRef = useRef(null), skipRef = useRef(null);
  const [santa, setSanta] = useState(false), api = useRef({});
  const logo = mode === 'out' ? logoUrl : tr.logoUrl || cfg.assets?.logoLargeUrl || cfg.assets?.logoUrl || logoUrl;

  useEffect(() => {
    const A = audio(), root = document.getElementById('theme-root'), cv = cvRef.current, ctx = cv.getContext('2d');
    const calm = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.round(v * 0.7)]));
    const phases = reduced ? calm(mode === 'out' ? { begin: 450, takeover: 1300, transform: 300, reveal: 900 } : tr.phases) : mode === 'out' ? { begin: 450, takeover: 1300, transform: 300, reveal: 900 } : tr.phases;
    const tl = buildTimeline(phases, { skipTransform: mode === 'out' });
    let W = 0, H = 0, D = 1, raf = 0, finished = false, covered = false, swapped = false, musicOn = false, burstDone = false, swapAt = 0;
    const resize = () => { D = Math.min(1.5, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * D; cv.height = H * D; };
    resize(); window.addEventListener('resize', resize);
    const mobile = W < 700, unit = Math.max(0.7, Math.min(1.4, Math.min(W, H) / 800));
    const colors = mode === 'out' ? baseColors : (tr.liquidColors?.length ? tr.liquidColors : ['#C8102E', '#FFFFFF']);
    const set = SETS[tr.particleSet] || SETS.christmas, budget = Math.round(particleBudget(tr.particles?.count ?? 46, { mobile }) * (reduced ? 0.25 : 1));
    const parts = [];
    const vol = cfg.audio?.masterVolume ?? 1, music = { ...cfg.audio.music, volume: (cfg.audio.music.volume ?? 0.6) * vol };
    // ---- ήχος: όλα προγραμματίζονται εκ των προτέρων στο ρολόι του AudioContext ----
    const useAudio = sound && A.running && !A.muted;
    const t0a = useAudio ? A.now() + 0.08 : 0, t0p = performance.now();
    if (useAudio) {
      if (mode === 'in') {
        for (const k of ['begin', 'takeover', 'transform', 'reveal']) {
          const s = cfg.audio.sfx?.[k]; if (!s?.url || (k === 'transform' && tl.transform[0] === tl.transform[1])) continue;
          A.play({ ...s, volume: (s.volume ?? 1) * vol }, { when: t0a + (tl[k][0] + (s.offsetMs || 0)) / 1000, slot: 'cine-' + k });
        }
        A.startMusic(music, { when: t0a + tl.reveal[0] / 1000 }); musicOn = true;
      } else {
        A.play({ url: '/audio/sfx/pop.mp3', volume: 0.8 * vol }, { when: t0a, slot: 'cine-a' });
        A.play({ url: '/audio/sfx/sparkle.mp3', volume: 0.6 * vol }, { when: t0a + tl.reveal[0] / 1000, slot: 'cine-b' });
      }
    }
    const clock = () => (useAudio ? (A.now() - t0a) * 1000 : performance.now() - t0p);
    // ---- σωματίδια ----
    const spawnEdge = () => {
      const img = sprite(set[(Math.random() * set.length) | 0]), size = (30 + Math.random() * 32) * unit, side = Math.random();
      const p = { img, size, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 5, g: H * 0.95, a: 1 };
      if (side < 0.36) Object.assign(p, { x: -size, y: H * (0.35 + Math.random() * 0.5), vx: W * (0.32 + Math.random() * 0.45), vy: -H * (0.55 + Math.random() * 0.45) });
      else if (side < 0.72) Object.assign(p, { x: W + size, y: H * (0.35 + Math.random() * 0.5), vx: -W * (0.32 + Math.random() * 0.45), vy: -H * (0.55 + Math.random() * 0.45) });
      else Object.assign(p, { x: W * (0.08 + Math.random() * 0.84), y: H + size, vx: (Math.random() - 0.5) * W * 0.3, vy: -H * (0.95 + Math.random() * 0.4) });
      parts.push(p);
    };
    const burst = (cx, cy, n) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (260 + Math.random() * 520) * unit; parts.push({ img: sprite(CONFETTI[(Math.random() * CONFETTI.length) | 0], 48), size: (10 + Math.random() * 14) * unit, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200 * unit, g: 700 * unit, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12, a: 1, fade: 1.6 }); } };
    const rain = () => parts.push({ img: sprite(CONFETTI[(Math.random() * CONFETTI.length) | 0], 48), size: (9 + Math.random() * 12) * unit, x: Math.random() * W, y: -20, vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 160, g: 60, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, a: 1, sway: Math.random() * TAU });
    // ---- υγρό ----
    const liquid = (ms, t) => {
      const n = colors.length;
      for (let i = 0; i < n; i++) {
        const L = layerLevel(tl, ms, i, n); if (L <= 0.0005) continue;
        ctx.fillStyle = colors[i];
        if (L >= 0.9995) { ctx.fillRect(0, 0, W, H); continue; }
        const y0 = H * (1 - L), A1 = (16 + H * 0.03) * Math.sin(Math.PI * L), k1 = TAU / (W * 0.62), k2 = TAU / (W * 0.27);
        ctx.beginPath(); ctx.moveTo(0, H); let first = true;
        for (let x = 0; x <= W + 16; x += 16) { const y = y0 + A1 * (0.62 * Math.sin(x * k1 + t * 2.1 + i * 1.7) + 0.38 * Math.sin(x * k2 - t * 3.3 + i * 2.9)); if (first) { ctx.lineTo(0, y); first = false; } ctx.lineTo(x, y); }
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.clip(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#fff';             // φυσαλίδες μέσα στο υγρό
        for (let b = 0; b < 7; b++) { const bx = ((b * 197 + i * 89) % 1000) / 1000 * W, by = H - ((t * (60 + b * 17) + b * 113) % (H * L + 40)); ctx.beginPath(); ctx.arc(bx + Math.sin(t * 2 + b) * 8, by, (3 + (b % 3) * 2) * unit, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    };
    const finish = () => {
      if (finished) return; finished = true; cancelAnimationFrame(raf);
      if (root) { root.style.transform = ''; root.style.filter = ''; root.style.transformOrigin = ''; }
      if (!covered) { covered = true; onCovered?.(); }
      onDone?.();
    };
    api.current.skip = () => {
      A.stopSlots({ pendingOnly: true });                                   // ό,τι ακούγεται ήδη τελειώνει κανονικά
      if (!covered) { covered = true; onCovered?.(); }
      if (mode === 'in') {
        const rv = cfg.audio.sfx?.reveal;
        if (useAudio && rv?.url && clock() < tl.reveal[0]) A.play({ ...rv, volume: (rv.volume ?? 1) * vol }, { slot: 'cine-reveal' });   // το «τελικό» εφέ παίζει μαζί με τη μουσική
        A.startMusicNow(music); musicOn = true;
      }
      if (mode === 'out') A.stopMusic(600);
      finish();
    };
    if (root) root.style.transformOrigin = '50% 40vh';
    const frame = () => {
      if (finished) return;
      const ms = Math.max(0, clock()), t = ms / 1000;
      const b = progressIn(tl, 'begin', ms), tk = progressIn(tl, 'takeover', ms), x = progressIn(tl, 'transform', ms), r = progressIn(tl, 'reveal', ms);
      // κάμερα: κραδασμός, ζουμ, αποκορεσμός της σελίδας πριν καλυφθεί
      const s = reduced ? 0 : shakeAt(tl, ms, tr.shake ?? 0.7);
      const jx = s ? (Math.sin(ms * 0.09) + Math.sin(ms * 0.137)) * 3.4 * s : 0, jy = s ? (Math.cos(ms * 0.11) + Math.sin(ms * 0.071)) * 2.8 * s : 0;
      if (root && !covered) { root.style.transform = reduced ? '' : `translate(${jx}px,${jy}px) scale(${1 + 0.035 * easeInOutCubic(b)})`; root.style.filter = `saturate(${1 - 0.55 * b}) brightness(${1 - 0.1 * b})`; }
      if (camRef.current) camRef.current.style.transform = `translate(${jx}px,${jy}px)`;
      // καμβάς
      ctx.setTransform(D, 0, 0, D, 0, 0); ctx.clearRect(0, 0, W, H);
      const vig = mode === 'in' ? 0.6 * b * (1 - tk) : 0.3 * b * (1 - tk);
      if (vig > 0.01) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(40,0,8,0)'); g.addColorStop(1, `rgba(40,0,8,${vig})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      liquid(ms, t);
      // εκπομπή σωματιδίων: πετούν στην οθόνη από τα τέλη της αρχής μέχρι το τέλος της μεταμόρφωσης
      const active = ms > tl.begin[0] + (tl.begin[1] - tl.begin[0]) * 0.55 && ms < tl.transform[1] - 300;
      if (active && budget) { let alive = 0; for (const p of parts) if (!p.fade && !p.sway) alive++; for (let k = 0; k < 3 && alive < budget * (0.4 + 0.6 * Math.min(1, tk * 2)); k++, alive++) spawnEdge(); }
      if (!reduced && mode === 'in' && r > 0 && r < 0.7 && tr.confetti) for (let k = 0; k < 2; k++) rain();
      const dt = 1 / 60;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.vy += p.g * dt; p.x += p.vx * dt + (p.sway !== undefined ? Math.sin(t * 3 + p.sway) * 40 * dt : 0); p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.fade) p.a -= dt / p.fade;
        if (p.a <= 0 || p.y > H + 120 || p.x < -200 || p.x > W + 200) { parts.splice(i, 1); continue; }
        const c = Math.cos(p.rot), sn = Math.sin(p.rot); ctx.globalAlpha = Math.max(0, Math.min(1, p.a));
        ctx.setTransform(c * D, sn * D, -sn * D, c * D, p.x * D, p.y * D); ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1; ctx.setTransform(D, 0, 0, D, 0, 0);
      // λάμψεις σε τροχιά γύρω από τον Κιμωλάκη κατά τη μεταμόρφωση
      if (mode === 'in' && x > 0.12 && x < 0.62 && tr.particles?.sparkles !== false && (!reduced || ((ms / 16) | 0) % 3 === 0)) {
        const cx = W / 2, cy = H * 0.56, sp = sprite('sparkle', 64), rr = Math.min(W, H) * (0.34 - 0.2 * clamp01((x - 0.12) / 0.5));
        for (let k = 0; k < 14; k++) { const a = t * (3 + k * 0.12) + (k * TAU) / 14, z = 18 + 10 * Math.sin(t * 9 + k); ctx.globalAlpha = 0.85; ctx.drawImage(sp, cx + Math.cos(a) * rr - z / 2, cy + Math.sin(a) * rr * 0.55 - z / 2, z, z); }
        ctx.globalAlpha = 1;
      }
      // λογότυπο στο κέντρο
      const lg = logoRef.current;
      if (lg) {
        const ap = clamp01((tk - 0.3) / 0.35), up = mode === 'in' ? easeInOutCubic(clamp01(x / 0.22)) : 0;
        const sc = (0.4 + 0.6 * easeOutBack(ap)) * (1 - 0.45 * up) * (1 + 0.15 * r), op = ap * (1 - easeOutCubic(clamp01(r * 1.5)));
        lg.style.opacity = op.toFixed(3); lg.style.transform = `translate(-50%, calc(-50% + ${(-28 * up).toFixed(2)}vh + ${(Math.sin(t * 2.2) * 6 * ap).toFixed(1)}px)) scale(${sc.toFixed(3)})`;
      }
      // σκηνή μεταμόρφωσης
      if (mode === 'in' && stageRef.current) {
        const st = stageRef.current, m = mascotRef.current, appear = easeOutBack(clamp01(x / 0.15)), p = clamp01((x - 0.15) / 0.45), th = 6 * Math.PI * easeInOutCubic(p);
        st.style.opacity = (clamp01(x / 0.08) * (1 - easeOutCubic(clamp01(r * 1.4)))).toFixed(3);
        st.style.transform = `translate(-50%,-50%) scale(${(appear * (1 + 0.25 * r)).toFixed(3)})`;
        if (m) m.style.transform = `scaleX(${Math.max(0.02, Math.abs(Math.cos(th))).toFixed(3)}) scaleY(${(1 + 0.06 * Math.sin(th * 2)).toFixed(3)}) translateY(${(Math.sin(t * 3) * 4).toFixed(1)}px)`;
        if (!swapped && th >= 2.5 * Math.PI) { swapped = true; swapAt = ms; setSanta(true); }
        if (swapped && !burstDone && tr.confetti && !reduced) { burstDone = true; burst(W / 2, H * 0.56, mobile ? 26 : 46); }
        if (flashRef.current) flashRef.current.style.opacity = tr.flash && swapped ? Math.max(0, Math.exp(-(ms - swapAt) / 140) * 0.9).toFixed(3) : '0';
        if (ringRef.current) ringRef.current.style.transform = `translate(-50%,-50%) scale(${(0.6 + 0.5 * clamp01(x / 0.6) + 0.04 * Math.sin(t * 5)).toFixed(3)}) rotate(${(t * 40).toFixed(1)}deg)`;
        if (speechRef.current) { const sp = clamp01((x - 0.68) / 0.15); speechRef.current.style.opacity = sp.toFixed(3); speechRef.current.style.transform = `scale(${(0.3 + 0.7 * easeOutBack(sp)).toFixed(3)})`; }
      }
      if (titleRef.current) { const tp = mode === 'in' ? clamp01((x - 0.75) / 0.2) * (1 - clamp01(r * 1.6)) : 0; titleRef.current.style.opacity = tp.toFixed(3); titleRef.current.style.transform = `translate(-50%,${((1 - tp) * 20).toFixed(1)}px)`; }
      if (!covered && ms >= tl.takeover[1]) {
        covered = true; onCovered?.();
        if (mode === 'out') A.stopMusic(900);
        if (root) { root.style.transform = ''; root.style.filter = ''; }
      }
      if (mode === 'in' && !musicOn && ms >= tl.reveal[0]) { musicOn = true; A.startMusic(music); }   // χωρίς ήχο από την αρχή → ξεκινά στο πρώτο κλικ
      if (ms >= tl.total) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    skipRef.current?.focus({ preventScroll: true });
    const key = (e) => { if (e.key === 'Escape' && tr.skippable) api.current.skip?.(); };
    window.addEventListener('keydown', key);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('keydown', key); if (root) { root.style.transform = ''; root.style.filter = ''; root.style.transformOrigin = ''; } };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`cine cine-${mode}${reduced ? ' cine-reduced' : ''}`} role="dialog" aria-modal="true" aria-label={mode === 'in' ? tx.transitionTitle : tx.toggleOff}>
      <canvas ref={cvRef} className="cine-cv" aria-hidden="true" />
      <div className="cine-cam" ref={camRef}>
        <div className="cine-logo" ref={logoRef} aria-hidden="true">{logo && <img src={logo} alt="" />}</div>
        {mode === 'in' && (
          <div className="cine-stage" ref={stageRef} aria-hidden="true">
            <div className="cine-ring" ref={ringRef} />
            <div className="cine-mascot" ref={mascotRef}><Mascot mood={santa ? 'celebrate' : 'wave'} costume={santa ? 'santa' : 'none'} className={santa ? 'santa-reveal' : ''} size={200} /></div>
            <div className="cine-speech" ref={speechRef}>{tx.santaSpeech}</div>
          </div>)}
        {mode === 'in' && <p className="cine-title" ref={titleRef}>{tx.transitionTitle}</p>}
      </div>
      <div className="cine-flash" ref={flashRef} aria-hidden="true" />
      {tr.skippable && <button ref={skipRef} type="button" className="cine-skip" onClick={() => api.current.skip?.()}>{tx.skip} ⏭</button>}
      <p className="sr-only" role="status">{mode === 'in' ? 'Ο ιστότοπος γίνεται εορταστικός…' : 'Επιστροφή στην κανονική εμφάνιση…'}</p>
    </div>
  );
}
