// Εποχιακά θέματα: προεπιλογές, επικύρωση ρυθμίσεων και διαθεσιμότητα. Τα Χριστούγεννα είναι το πρώτο θέμα· το σύστημα είναι γενικό.
// Σημεία βρόχου της μουσικής: 2.269.665 και 4.386.904 δείγματα στα 44.100 Hz = 00:51.466 και 01:39.476.
export const CHRISTMAS_AUDIO = {
  music: { url: '/audio/christmas-music.mp3', loopStartMs: 51466.32653, loopEndMs: 99476.28118, volume: 0.55, fadeInMs: 2500 },
  sfx: {
    begin: { url: '/audio/christmas-sfx.mp3', startMs: 0, endMs: 0, offsetMs: 0, volume: 0.9 },          // ολόκληρο το ηχητικό, χωρίς κόψιμο
    takeover: { url: '/audio/sfx/swell.mp3', startMs: 0, endMs: 0, offsetMs: 1250, volume: 0.55 },
    transform: { url: '/audio/sfx/transform.mp3', startMs: 0, endMs: 0, offsetMs: 300, volume: 0.75 },
    reveal: { url: '/audio/sfx/jingle.mp3', startMs: 0, endMs: 0, offsetMs: 0, volume: 0.8 },
  },
};
export const PARTICLE_SETS = ['christmas', 'confetti', 'hearts', 'leaves', 'flowers'];
export const COSTUMES = ['none', 'santa'];
export function christmasDefaults(now = new Date()) {
  const y = now.getUTCMonth() === 0 && now.getUTCDate() < 8 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  return {
    colors: { paper: '#FFF9F5', paper2: '#FCE8E6', ink: '#2A0F14', board: '#8E1023', c1: '#7FD1AE', c2: '#C8102E', c3: '#F6C453', c4: '#0F7B4B', c5: '#3A86C8', c6: '#E8573D' },
    fx: { snow: true, snowCount: 110, snowSpeed: 1, snowInteractive: true, sparkles: true, decorations: true, lights: true, snowCaps: true, ornaments: true },
    texts: {
      toggleOn: 'Χριστουγεννιάτικη λειτουργία', toggleOff: 'Κανονική εμφάνιση',
      popupTitle: 'Ήρθαν τα Χριστούγεννα! 🎄', popupText: 'Ο Κιμωλάκης ετοιμάζει μια έκπληξη… Θες να δεις τον ιστότοπο να γίνεται χριστουγεννιάτικος;',
      popupAccept: '🎅 Ναι, ενεργοποίηση!', popupDecline: 'Όχι τώρα',
      startTitle: 'Μια χριστουγεννιάτικη έκπληξη σε περιμένει!', startButton: '🎄 Πάτα για να ξεκινήσει η μαγεία',
      transitionTitle: 'Καλά Χριστούγεννα!', santaSpeech: 'Χο χο χο! Καλά Χριστούγεννα!',
      heroPhrases: 'Χο χο χο!\nΚαλές γιορτές!\nΔιάβασες το χριστουγεννιάτικο τεύχος;\nΠοιος θέλει μελομακάρονα;\nΚάνε μια ευχή!',
      countdown: 'Ως τα Χριστούγεννα: {n} μέρες! 🎁', countdownOne: 'Αύριο Χριστούγεννα! 🎁', christmasDay: 'Χρόνια πολλά! Καλά Χριστούγεννα! 🎄',
      activationMessage: 'Πάτα το κουμπί και δες τον Κιμωλάκη να γίνεται Άγιος Βασίλης!', skip: 'Παράλειψη',
    },
    // Εποχιακές εικόνες: λογότυπο (μενού/υποσέλιδο), μεγάλο λογότυπο (αρχική/μετάβαση), λογότυπο-πίνακας, favicon.
    assets: { logoUrl: '/brand/christmas/logo_text_christmas.png', logoLargeUrl: '/brand/christmas/logo_text_christmas@2x.png', boardLogoUrl: '/brand/christmas/logo_bg_christmas.png', faviconUrl: '/brand/christmas/favicon-square.png' },
    mascot: { costume: 'santa' },
    transition: {
      phases: { begin: 2200, takeover: 4200, transform: 3400, reveal: 2200 }, shake: 0.7, particleSet: 'christmas',
      particles: { count: 46, sparkles: true }, liquidColors: ['#FFFFFF', '#0F7B4B', '#C8102E', '#8E1023'], logoUrl: '', flash: true, confetti: true, skippable: true,
    },
    audio: { masterVolume: 0.8, ...CHRISTMAS_AUDIO },
    schedule: { activateFrom: `${y}-12-22T22:00:00.000Z`, activateUntil: `${y + 1}-01-07T21:59:00.000Z`, popupEnabled: true, popupDelayMs: 2500 },
  };
}
export const DEFAULT_THEMES = (now) => [{ slug: 'christmas', name: 'Χριστούγεννα', mode: 'auto', config: christmasDefaults(now) }];

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const RANGES = { 'fx.snowCount': [0, 400], 'fx.snowSpeed': [0.2, 3], 'transition.shake': [0, 2], 'transition.particles.count': [0, 120], 'audio.masterVolume': [0, 1], 'schedule.popupDelayMs': [0, 30000] };
const range = (path) => RANGES[path] || (/phases\./.test(path) ? [300, 15000] : /volume/i.test(path) ? [0, 1] : /Ms$/.test(path) ? [0, 36000000] : [-1e9, 1e9]);
const str = (v, max = 500) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
const url = (v) => { const s = str(v, 1000).trim(); return s === '' || (s.startsWith('/') && !s.startsWith('//')) || /^https:\/\//i.test(s) ? s : ''; };
/** Επικυρώνει/καθαρίζει τις ρυθμίσεις θέματος με βάση τις προεπιλογές (άγνωστα πεδία απορρίπτονται). */
export function cleanThemeConfig(input, defaults = christmasDefaults(), path = '') {
  if (!path) input = migrateThemeConfig(input);
  const out = {};
  for (const [k, d] of Object.entries(defaults)) {
    const p = path ? `${path}.${k}` : k, v = input?.[k];
    if (Array.isArray(d)) out[k] = Array.isArray(v) ? v.slice(0, 8).map((c) => (HEX.test(String(c)) ? String(c) : '#FFFFFF')) : d;
    else if (d && typeof d === 'object') out[k] = cleanThemeConfig(v && typeof v === 'object' ? v : {}, d, p);
    else if (typeof d === 'boolean') out[k] = v === undefined ? d : v === true;
    else if (typeof d === 'number') { const [a, b] = range(p); const n = Number(v); out[k] = v === undefined || v === '' || !Number.isFinite(n) ? d : Math.min(b, Math.max(a, n)); }
    else if (path === 'colors') out[k] = HEX.test(String(v)) ? String(v) : d;
    else if (/url$/i.test(k)) out[k] = v === undefined ? d : url(v);
    else if (k === 'costume') out[k] = COSTUMES.includes(v) ? v : d;
    else if (k === 'particleSet') out[k] = PARTICLE_SETS.includes(v) ? v : d;
    else if (/^(activateFrom|activateUntil)$/.test(k)) { const t = v ? new Date(v) : null; out[k] = t && !isNaN(t) ? t.toISOString() : v === '' ? '' : d; }
    else out[k] = v === undefined ? d : str(v, /^(popupText|activationMessage|heroPhrases)$/.test(k) ? 800 : 200);
  }
  if (out.music && out.music.loopEndMs <= out.music.loopStartMs) out.music.loopEndMs = 0;   // άκυρος βρόχος → απλή επανάληψη ολόκληρου του κομματιού
  return out;
}
/** Αναβάθμιση αποθηκευμένων ρυθμίσεων: η παλιά προεπιλογή έκοβε το χριστουγεννιάτικο ηχητικό σε δύο κομμάτια — τώρα παίζει ολόκληρο. */
function migrateThemeConfig(c) {
  const s = c?.audio?.sfx; if (!s) return c;
  const old = (x, a, b) => x?.url === '/audio/christmas-sfx.mp3' && +x.startMs === a && +x.endMs === b;
  if (!old(s.begin, 0, 3420) && !old(s.reveal, 3420, 4400)) return c;
  const sfx = { ...s };
  if (old(s.begin, 0, 3420)) sfx.begin = { ...s.begin, endMs: 0 };
  if (old(s.reveal, 3420, 4400)) sfx.reveal = { ...CHRISTMAS_AUDIO.sfx.reveal };
  return { ...c, audio: { ...c.audio, sfx } };
}
/** Διαθεσιμότητα θέματος: mode 'on' = πάντα, 'auto' = εντός χρονικού παραθύρου, 'off' = ποτέ. */
export function themeAvailability(theme, now = new Date()) {
  if (!theme) return { available: false, reason: 'missing' };
  if (theme.mode === 'on') return { available: true, reason: 'manual' };
  if (theme.mode !== 'auto') return { available: false, reason: 'off' };
  const s = theme.config?.schedule || {}, from = s.activateFrom ? new Date(s.activateFrom) : null, until = s.activateUntil ? new Date(s.activateUntil) : null;
  if (!from || isNaN(from)) return { available: false, reason: 'noDate' };
  if (now < from) return { available: false, reason: 'before' };
  if (until && !isNaN(until) && now > until) return { available: false, reason: 'after' };
  return { available: true, reason: 'window' };
}
