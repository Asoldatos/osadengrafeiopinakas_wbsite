'use client';
// Πραγματικός χρόνος: Ably μέσω Server-Sent Events (μόνο λήψη, χωρίς βιβλιοθήκη). Αν δεν υπάρχει/αποτύχει → «polling» από τον δικό μας διακομιστή.
import { api } from './clientUpload';

export function connectRealtime({ channel, onEvent, onState }) {
  let es = null, closed = false, timer = null, fails = 0, lastEvent = '';
  const retry = (ms) => { clearTimeout(timer); timer = setTimeout(open, ms); };
  const open = async () => {
    if (closed) return;
    let t; try { t = await api(`/api/chat/token${channel ? `?ch=${channel}` : ''}`); } catch { t = null; }
    if (closed) return;
    if (!t?.realtime) { onState(false); retry(60000); return; }
    const qs = `v=1.2&channels=${t.channels.map(encodeURIComponent).join(',')}&accessToken=${encodeURIComponent(t.token)}${lastEvent ? `&lastEvent=${encodeURIComponent(lastEvent)}` : ''}`;
    try { es?.close(); } catch {}
    es = new EventSource(`https://main.realtime.ably.net/event-stream?${qs}`);
    es.onopen = () => { fails = 0; onState(true); };
    es.onmessage = (ev) => {
      if (ev.lastEventId) lastEvent = ev.lastEventId;
      try { const env = JSON.parse(ev.data); let d = env.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch {} } if (env.channel) onEvent(env.channel, env.name, d); } catch {}
    };
    // Σφάλμα (π.χ. έληξε το token): κλείνουμε, παίρνουμε νέο token και ξανασυνδεόμαστε με «lastEvent» ώστε να μη χαθεί τίποτα
    es.onerror = () => { try { es.close(); } catch {} es = null; onState(false); fails++; retry(Math.min(30000, 1000 * 2 ** Math.min(fails, 5))); };
    // ανανέωση token λίγο πριν λήξει
    retry(Math.max(60000, (t.expires || Date.now() + 3600000) - Date.now() - 120000));
  };
  open();
  return () => { closed = true; clearTimeout(timer); try { es?.close(); } catch {} };
}
/** Μικροί ήχοι (WebAudio, χωρίς αρχεία). */
let ac = null;
const ctx = () => (ac ||= new (window.AudioContext || window.webkitAudioContext)());
export function blip(f = 880, d = 0.12, v = 0.08) {
  try { const a = ctx(), o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + d); } catch {}
}
export function ringtone() {
  let on = true; const loop = () => { if (!on) return; blip(660, 0.25, 0.12); setTimeout(() => on && blip(880, 0.3, 0.12), 260); setTimeout(loop, 1800); }; loop();
  return () => { on = false; };
}
/** Μορφοποίηση τύπου Discord: **έντονα**, *πλάγια*, ~~διαγραφή~~, `κώδικας`, ||spoiler||, @αναφορές. */
export function parseFmt(text) {
  const out = []; const re = /(\*\*[^*\n]+\*\*|~~[^~\n]+~~|`[^`\n]+`|\|\|[^|\n]+\|\||\*[^*\n]+\*|@[\p{L}\p{N}_.]{2,40})/gu; let last = 0, m;
  while ((m = re.exec(text))) { if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) }); const s = m[0];
    out.push(s.startsWith('**') ? { t: 'b', v: s.slice(2, -2) } : s.startsWith('~~') ? { t: 's', v: s.slice(2, -2) } : s.startsWith('`') ? { t: 'code', v: s.slice(1, -1) } : s.startsWith('||') ? { t: 'spoiler', v: s.slice(2, -2) } : s.startsWith('@') ? { t: 'mention', v: s } : { t: 'i', v: s.slice(1, -1) });
    last = m.index + s.length; }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}
