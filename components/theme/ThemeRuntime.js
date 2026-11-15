'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Mascot, { CostumeProvider } from '../Mascot';
import { audio } from '../audio/engine';
import Snow from './Snow';
import Media from '../Media';
import CinematicTransition from './CinematicTransition';

const Ctx = createContext({ theme: null, active: false, available: false, cfg: null, toggle: () => {}, begin: () => {} });
export const useSeasonal = () => useContext(Ctx);
/** Λογότυπο που αλλάζει με το εποχιακό θέμα (size: 'small' για μενού/υποσέλιδο, 'large' για αρχική). */
export function useThemedLogo(fallback, size = 'small') {
  const s = useContext(Ctx), a = s.active ? s.cfg?.assets : null;
  return (size === 'large' ? a?.logoLargeUrl || a?.logoUrl : a?.logoUrl || a?.logoLargeUrl) || fallback;
}
export function ThemedLogo({ src, size = 'small', ...rest }) {
  const url = useThemedLogo(src, size); if (!url) return null;
  return <Media src={url} {...rest} />;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const prefers = (q) => typeof window !== 'undefined' && window.matchMedia?.(q).matches;
const readPref = (slug) => { try { const m = document.cookie.match(/(?:^|;\s*)theme_pref=([^;]+)/); const [s, v] = decodeURIComponent(m?.[1] || '').split(':'); return s === slug ? v : null; } catch { return null; } };
const writePref = (slug, on) => { document.cookie = `theme_pref=${encodeURIComponent(`${slug}:${on ? 'on' : 'off'}`)};path=/;max-age=31536000;samesite=lax`; };

/** Εποχιακό θέμα σε όλον τον ιστότοπο.
 *  • Επισκέπτες από το κουμπί του newsletter (υπογεγραμμένο cookie μίας χρήσης «intro») → αυτόματη κινηματογραφική μετάβαση.
 *  • Υπόλοιποι επισκέπτες → εορταστικό παράθυρο-πρόσκληση· μπορούν να το ενεργοποιήσουν και αργότερα από το κουμπί στο μενού.
 *  • Η επιλογή θυμάται (cookie theme_pref) ώστε η σελίδα να φορτώνει απευθείας στη σωστή εμφάνιση χωρίς «αναλαμπή». */
export default function ThemeRuntime({ theme, available = false, initialActive = false, intro = false, canPreview = false, logoUrl = '', baseColors = [], children }) {
  const cfg = theme?.config || null;
  const [active, setActive] = useState(!!(theme && initialActive));
  const [run, setRun] = useState(null);           // { mode, persist, sound }
  const [popup, setPopup] = useState(false), [gate, setGate] = useState(null), [preview, setPreview] = useState(false), [pulse, setPulse] = useState(false);
  const [reduced, setReduced] = useState(false);
  const busy = useRef(false);
  useEffect(() => { setReduced(prefers('(prefers-reduced-motion: reduce)')); }, []);

  const start = useCallback(async ({ persist = true, fromGesture = false } = {}) => {
    if (!theme || busy.current) return;
    busy.current = true; setPopup(false); setGate(null);
    const A = audio(); A.ensure();
    if (cfg) { A.load(cfg.audio.music.url); for (const s of Object.values(cfg.audio.sfx || {})) if (s?.url) A.load(s.url); }   // προφόρτωση όσο τρέχει η αρχή
    if (fromGesture) await Promise.race([A.unlock(), sleep(300)]);
    setRun({ mode: 'in', persist });
  }, [theme, cfg]);

  const stop = useCallback(() => { if (!theme || busy.current) return; busy.current = true; setRun({ mode: 'out', persist: true }); }, [theme]);

  // Αυτόματη έναρξη (newsletter / δοκιμή διαχειριστή): αν ο browser επιτρέπει ήχο ξεκινά αμέσως· αλλιώς ένα κουμπί «Πάτα για να ξεκινήσει»
  // (απαιτείται από τους browsers για ήχο). Αν δεν πατηθεί σε 8″, η μετάβαση ξεκινά χωρίς ήχο και η μουσική ακολουθεί στο πρώτο κλικ.
  const autoStart = useCallback(async (persist) => {
    const A = audio(); A.ensure();
    await Promise.race([A.unlock(), sleep(250)]);
    if (A.running) start({ persist }); else setGate({ persist, left: 8 });
  }, [start]);

  useEffect(() => {
    if (!theme) return;
    const url = new URL(location.href), test = url.searchParams.get('theme-test'), prev = url.searchParams.get('theme-preview');
    const clean = () => { url.searchParams.delete('theme-test'); url.searchParams.delete('theme-preview'); history.replaceState(null, '', url.pathname + (url.search || '') + url.hash); };
    if (canPreview && test === theme.slug) { clean(); setActive(false); autoStart(false); return; }
    if (canPreview && prev === theme.slug) { clean(); setPreview(true); setActive(true); return; }
    if (intro) { fetch('/api/theme/consume', { method: 'POST' }).catch(() => {}); if (!active) autoStart(true); return; }
    const pref = readPref(theme.slug);
    if (available && !active && pref == null && cfg.schedule.popupEnabled) { const id = setTimeout(() => setPopup(true), cfg.schedule.popupDelayMs ?? 2500); return () => clearTimeout(id); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Αντίστροφη μέτρηση της αυτόματης έναρξης χωρίς ήχο
  useEffect(() => {
    if (!gate) return;
    if (gate.left <= 0) { start({ persist: gate.persist }); return; }
    const id = setTimeout(() => setGate((g) => g && { ...g, left: g.left - 1 }), 1000); return () => clearTimeout(id);
  }, [gate, start]);

  // Favicon: όσο το θέμα είναι ενεργό, η καρτέλα δείχνει το εποχιακό εικονίδιο.
  useEffect(() => {
    const fav = active && cfg?.assets?.faviconUrl;
    document.querySelectorAll('link[rel~="icon"]').forEach((l) => {
      if (l.dataset.orig === undefined) l.dataset.orig = l.getAttribute('href') || '';
      l.setAttribute('href', fav || l.dataset.orig);
    });
  }, [active, cfg]);

  // Μουσική: παίζει όσο το θέμα είναι ενεργό (ξεκινά στο πρώτο κλικ λόγω των κανόνων των browsers).
  useEffect(() => {
    if (!cfg || run) return;
    const A = audio();
    if (active) A.startMusic({ ...cfg.audio.music, volume: (cfg.audio.music.volume ?? 0.6) * (cfg.audio.masterVolume ?? 1) }); else A.stopMusic(800);
  }, [active, run, cfg]);

  const decline = () => { writePref(theme.slug, false); setPopup(false); setPulse(true); setTimeout(() => setPulse(false), 6000); };
  const toggle = () => (active ? stop() : start({ persist: true, fromGesture: true }));
  const style = useMemo(() => (active && cfg ? Object.fromEntries(Object.entries(cfg.colors).map(([k, v]) => [`--${k}`, v])) : undefined), [active, cfg]);
  const value = { theme, cfg, active, available: available || preview || (canPreview && !!theme), toggle, begin: start, pulse, preview };
  const costume = active && cfg ? cfg.mascot?.costume || 'none' : 'none';

  return (
    <Ctx.Provider value={value}>
      <CostumeProvider costume={costume}>
        <div id="theme-root" className="theme-root" data-theme={active && theme ? theme.slug : undefined} style={style}>{children}</div>
        {active && cfg?.fx.snow && <Snow count={cfg.fx.snowCount} speed={cfg.fx.snowSpeed} interactive={cfg.fx.snowInteractive} />}
        {preview && <div className="theme-preview-bar" role="status">👀 Προεπισκόπηση θέματος «{theme.name}» (μόνο εσύ το βλέπεις) <button type="button" className="btn btn-light sm" onClick={() => { setPreview(false); setActive(false); }}>Έξοδος</button></div>}
        {popup && <ThemePopup cfg={cfg} onAccept={() => start({ persist: true, fromGesture: true })} onDecline={decline} />}
        {gate && <StartGate cfg={cfg} left={gate.left} onStart={() => start({ persist: gate.persist, fromGesture: true })} />}
        {run && (
          <CinematicTransition key={run.mode} theme={theme} mode={run.mode} reduced={reduced} logoUrl={logoUrl} baseColors={baseColors}
            onCovered={() => { const on = run.mode === 'in'; setActive(on); if (run.persist) writePref(theme.slug, on); }}
            onDone={() => { setRun(null); busy.current = false; }} />)}
      </CostumeProvider>
    </Ctx.Provider>
  );
}

function useDialog(onEscape) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement; ref.current?.querySelector('button')?.focus();
    const k = (e) => {
      if (e.key === 'Escape') onEscape?.();
      if (e.key === 'Tab' && ref.current) { const f = [...ref.current.querySelectorAll('button')]; if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    };
    window.addEventListener('keydown', k); return () => { window.removeEventListener('keydown', k); prev?.focus?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}
function ThemePopup({ cfg, onAccept, onDecline }) {
  const ref = useDialog(onDecline), t = cfg.texts;
  return (
    <div className="xpop-back">
      <div className="xpop" ref={ref} role="dialog" aria-modal="true" aria-labelledby="xpop-t">
        <span className="xpop-snow" aria-hidden="true">❄ ❅ ❆ ❄ ❅</span>
        <div className="xpop-m"><Mascot mood="wave" costume="santa" size={130} /></div>
        <h2 id="xpop-t">{t.popupTitle}</h2><p>{t.popupText}</p>
        <div className="btns center"><button type="button" className="btn btn-xmas" onClick={onAccept}>{t.popupAccept}</button><button type="button" className="btn btn-ghost" onClick={onDecline}>{t.popupDecline}</button></div>
        <p className="xpop-hint">Μπορείς να το αλλάξεις όποτε θέλεις από το κουμπί 🎄 στο μενού.</p>
      </div>
    </div>
  );
}
function StartGate({ cfg, left, onStart }) {
  const ref = useDialog(null), t = cfg.texts;
  return (
    <div className="xpop-back xgate">
      <div className="xpop" ref={ref} role="dialog" aria-modal="true" aria-labelledby="xgate-t">
        <div className="xpop-m"><Mascot mood="celebrate" size={120} /></div>
        <h2 id="xgate-t">{t.startTitle}</h2>
        <button type="button" className="btn btn-xmas big" onClick={onStart}>{t.startButton}</button>
        <p className="xpop-hint" aria-live="polite">Ξεκινά αυτόματα χωρίς ήχο σε {left}″…</p>
      </div>
    </div>
  );
}
/** Κουμπί στο μενού: ενεργοποίηση/απενεργοποίηση του θέματος (με τη μετάβαση). */
export function ThemeToggle() {
  const s = useSeasonal();
  if (!s.theme || !s.available) return null;
  const t = s.cfg.texts;
  return (
    <button type="button" className={`icon-btn theme-tg${s.active ? ' on' : ''}${s.pulse ? ' pulse' : ''}`} aria-pressed={s.active} onClick={s.toggle}
      title={s.active ? t.toggleOff : t.toggleOn} aria-label={s.active ? `${t.toggleOff} (απενεργοποίηση θέματος «${s.theme.name}»)` : `${t.toggleOn} (ενεργοποίηση θέματος «${s.theme.name}»)`}>
      <span aria-hidden="true">{s.active ? '🎄' : '🎅'}</span>
    </button>
  );
}
/** Λαμπάκια κάτω από το μενού (αναβοσβήνουν· όχι με «μείωση κίνησης»). */
export function Lights() {
  const s = useSeasonal();
  if (!s.active || !s.cfg?.fx.lights) return null;
  return <div className="xlights" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ '--d': `${(i * 0.37) % 2}s` }} />)}</div>;
}
/** Κρεμαστά στολίδια στην αρχική: κάθε στολίδι παίζει μια νότα (μικρό μουσικό όργανο!). */
const NOTES = [['Ντο', 523.25], ['Ρε', 587.33], ['Μι', 659.25], ['Σολ', 783.99], ['Λα', 880], ['Ντο', 1046.5]];
const BALL = ['#C8102E', '#F6C453', '#0F7B4B', '#3A86C8', '#C8102E', '#F6C453'];
/** Αντίστροφη μέτρηση ως τα Χριστούγεννα (ώρα Ελλάδας). Υπολογίζεται μόνο στον browser, για να μην αλλάζει το HTML του διακομιστή. */
export function Countdown() {
  const s = useSeasonal(), [d, setD] = useState(null);
  useEffect(() => {
    const calc = () => { const [y, m, dd] = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' }).split('-').map(Number); return Math.round((Date.UTC(y, 11, 25) - Date.UTC(y, m - 1, dd)) / 864e5); };
    setD(calc()); const id = setInterval(() => setD(calc()), 60000); return () => clearInterval(id);
  }, []);
  if (!s.active || s.theme?.slug !== 'christmas' || d === null || d < -1 || d > 40) return null;
  const t = s.cfg?.texts || {}, text = d <= 0 ? t.christmasDay : d === 1 ? t.countdownOne : String(t.countdown || '').replace('{n}', d);
  if (!text) return null;
  return <p className="xcount" role="status"><span aria-hidden="true">{d <= 0 ? '🎄' : '⏳'}</span> {text}</p>;
}
export function Ornaments() {
  const s = useSeasonal(), [ring, setRing] = useState({});
  if (!s.active || !s.cfg?.fx.ornaments) return null;
  const hit = (i) => { audio().bell(NOTES[i][1], 0.45); setRing((r) => ({ ...r, [i]: (r[i] || 0) + 1 })); };
  return (
    <div className="xorn" role="group" aria-label="Στολίδια: πάτα για να παίξεις μουσική">
      {NOTES.map(([n], i) => (
        <button key={i} type="button" className={`xorn-b${ring[i] ? (ring[i] % 2 ? ' ra' : ' rb') : ''}`} style={{ '--h': `${10 + ((i * 23) % 40)}px`, '--c': BALL[i], '--sw': `${2.6 + (i % 3) * 0.4}s` }} onClick={() => hit(i)} aria-label={`Στολίδι, νότα ${n}`}>
          <span className="xorn-s" /><span className="xorn-ball"><i /></span>
        </button>))}
    </div>
  );
}
