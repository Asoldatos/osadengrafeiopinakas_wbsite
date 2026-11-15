// Χρονοδιάγραμμα και καμπύλες κίνησης της κινηματογραφικής μετάβασης (κοινό για κάθε εποχιακό θέμα).
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeInCubic = (x) => x * x * x;
export const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const easeOutElastic = (x) => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
export const PHASES = ['begin', 'takeover', 'transform', 'reveal'];
export function buildTimeline(p = {}, { skipTransform = false } = {}) {
  const d = { begin: 2200, takeover: 4200, transform: 3400, reveal: 2200, ...p };
  if (skipTransform) d.transform = 0;
  let t = 0; const tl = {};
  for (const k of PHASES) { const v = k === 'transform' && skipTransform ? 0 : Math.min(15000, Math.max(300, +d[k] || 300)); tl[k] = [t, t + v]; t += v; }
  tl.total = t; return tl;
}
export function phaseAt(tl, ms) { for (const k of PHASES) if (ms < tl[k][1]) return k; return 'done'; }
export const progressIn = (tl, k, ms) => (tl[k][1] === tl[k][0] ? (ms >= tl[k][1] ? 1 : 0) : clamp01((ms - tl[k][0]) / (tl[k][1] - tl[k][0])));
/** Στάθμη (0–1) του υγρού για το στρώμα i από n: ανεβαίνει στη φάση «takeover» και αδειάζει στη φάση «reveal», με καθυστέρηση ανά στρώμα. */
export function layerLevel(tl, ms, i, n) {
  const d = n > 1 ? 0.14 : 0, span = 1 - (n - 1) * d;
  const rise = clamp01((progressIn(tl, 'takeover', ms) - i * d) / span);
  const drain = clamp01((progressIn(tl, 'reveal', ms) - (n - 1 - i) * d) / span);
  return easeInOutCubic(rise) * (1 - easeInOutCubic(drain));
}
/** Ένταση κραδασμού (0–1): ήπια στην αρχή, κορύφωση στη «takeover», σβήνει πριν τη «reveal». */
export function shakeAt(tl, ms, strength = 1) {
  const b = progressIn(tl, 'begin', ms), t = progressIn(tl, 'takeover', ms), x = progressIn(tl, 'transform', ms);
  const base = ms < tl.begin[1] ? 0.15 + 0.35 * b : ms < tl.takeover[1] ? 0.5 + 0.5 * Math.sin(Math.PI * t) : ms < tl.transform[1] ? 0.35 * (1 - x) : 0;
  return base * strength;
}
/** Ο αριθμός σωματιδίων προσαρμόζεται στη συσκευή. */
export const particleBudget = (count, { mobile = false, lowPower = false } = {}) => Math.max(0, Math.round(count * (mobile ? 0.55 : 1) * (lowPower ? 0.6 : 1)));
/** Θέση (σε δευτερόλεπτα) μέσα στη μουσική μετά από t δευτερόλεπτα αναπαραγωγής με βρόχο [start, end). */
export function loopPosition(t, start, end) { if (t < end || end <= start) return t; return start + ((t - start) % (end - start)); }
