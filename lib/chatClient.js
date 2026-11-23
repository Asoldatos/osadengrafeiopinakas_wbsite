'use client';
// Πραγματικός χρόνος: Ably μέσω Server-Sent Events (μόνο λήψη, χωρίς βιβλιοθήκη). Αν δεν υπάρχει/αποτύχει → «polling» από τον δικό μας διακομιστή.
import { api } from './clientUpload';

export function connectRealtime({ channel, onEvent, onState }) {
  let es = null, closed = false, retry = null;
  const open = async () => {
    if (closed) return;
    let t; try { t = await api(`/api/chat/token${channel ? `?ch=${channel}` : ''}`); } catch { t = null; }
    if (closed) return;
    if (!t?.realtime) { onState(false); retry = setTimeout(open, 60000); return; }
    es = new EventSource(`https://realtime.ably.io/sse?v=1.2&channels=${t.channels.map(encodeURIComponent).join(',')}&accessToken=${encodeURIComponent(t.token)}`);
    es.onopen = () => onState(true);
    es.onmessage = (ev) => { try { const env = JSON.parse(ev.data); let d = env.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch {} } onEvent(env.channel, env.name, d); } catch {} };
    es.onerror = () => { if (es?.readyState === 2) { onState(false); es = null; retry = setTimeout(open, 5000); } };
    // ανανέωση token πριν λήξει
    retry = setTimeout(() => { try { es?.close(); } catch {} es = null; open(); }, Math.max(60000, (t.expires || Date.now() + 3600000) - Date.now() - 120000));
  };
  open();
  return () => { closed = true; clearTimeout(retry); try { es?.close(); } catch {} };
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
